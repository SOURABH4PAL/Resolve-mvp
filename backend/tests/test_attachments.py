"""Tests for ticket attachment uploads, multi-file uploads, supported formats, and size limits."""

import io
import pytest
from tests.conftest import (
    make_user, make_admin, make_department, make_category, make_ticket, auth_headers
)


class TestAttachments:
    def test_single_file_upload_success(self, client, db):
        """User can upload a valid single attachment (.pdf)."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_ATT_01")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        file_data = io.BytesIO(b"%PDF-1.4 test pdf content")
        resp = client.post(
            f"/api/tickets/{ticket.id}/attachments",
            files={"file": ("document.pdf", file_data, "application/pdf")},
            headers=auth_headers(emp),
        )

        assert resp.status_code == 201, resp.json()
        data = resp.json()
        assert data["file_name"] == "document.pdf"
        assert data["ticket_id"] == ticket.id
        assert data["uploaded_by"] == emp.id
        assert data["file_size"] > 0
        assert "file_path" not in data  # security: never expose filesystem path

    def test_multiple_file_upload_success(self, client, db):
        """User can upload multiple files simultaneously via the batch endpoint."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_ATT_02")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        files = [
            ("files", ("screenshot.png", io.BytesIO(b"\x89PNG\r\n\x1a\nfakeimage"), "image/png")),
            ("files", ("notes.txt", io.BytesIO(b"log error trace"), "text/plain")),
            ("files", ("summary.docx", io.BytesIO(b"PK\x03\x04fakeworddoc"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
        ]
        resp = client.post(
            f"/api/tickets/{ticket.id}/attachments/multiple",
            files=files,
            headers=auth_headers(emp),
        )

        assert resp.status_code == 201, resp.json()
        data = resp.json()
        assert len(data) == 3
        filenames = [f["file_name"] for f in data]
        assert "screenshot.png" in filenames
        assert "notes.txt" in filenames
        assert "summary.docx" in filenames
        for item in data:
            assert "file_path" not in item

    def test_unsupported_file_type_rejected(self, client, db):
        """Uploading an executable (.exe) or script (.sh) is rejected with 400 Bad Request."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_ATT_03")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        file_data = io.BytesIO(b"MZ executable header")
        resp = client.post(
            f"/api/tickets/{ticket.id}/attachments",
            files={"file": ("malicious.exe", file_data, "application/x-msdownload")},
            headers=auth_headers(emp),
        )

        assert resp.status_code == 400
        assert "unsupported file type" in resp.json()["detail"].lower()

    def test_batch_unsupported_file_type_rejected(self, client, db):
        """Multi-file upload with one unsupported file rejects the entire batch with 400."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_ATT_04")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        files = [
            ("files", ("valid.pdf", io.BytesIO(b"%PDF valid"), "application/pdf")),
            ("files", ("bad_script.sh", io.BytesIO(b"#!/bin/bash echo bad"), "application/x-sh")),
        ]
        resp = client.post(
            f"/api/tickets/{ticket.id}/attachments/multiple",
            files=files,
            headers=auth_headers(emp),
        )

        assert resp.status_code == 400
        assert "unsupported file type" in resp.json()["detail"].lower()

    def test_empty_file_rejected(self, client, db):
        """Uploading an empty file (0 bytes) is rejected with 400 Bad Request."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_ATT_05")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        file_data = io.BytesIO(b"")
        resp = client.post(
            f"/api/tickets/{ticket.id}/attachments",
            files={"file": ("empty.txt", file_data, "text/plain")},
            headers=auth_headers(emp),
        )

        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"].lower()

    def test_oversized_file_rejected(self, client, db):
        """Uploading a file exceeding MAX_UPLOAD_SIZE_MB (10MB) is rejected with 400."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_ATT_06")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        # 11 MB of dummy data
        oversized = io.BytesIO(b"0" * (11 * 1024 * 1024))
        resp = client.post(
            f"/api/tickets/{ticket.id}/attachments",
            files={"file": ("huge_report.pdf", oversized, "application/pdf")},
            headers=auth_headers(emp),
        )

        assert resp.status_code == 400
        assert "exceeds maximum allowed limit" in resp.json()["detail"].lower()

    def test_unauthorized_user_cannot_upload_attachment(self, client, db):
        """A user who is neither creator, assigned, nor admin cannot attach files to the ticket."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        creator = make_user(db, employee_id="EMP_ATT_07")
        unrelated_user = make_user(db, employee_id="EMP_ATT_08")
        ticket = make_ticket(db, creator=creator, category_id=cat.id)

        file_data = io.BytesIO(b"hello world")
        resp = client.post(
            f"/api/tickets/{ticket.id}/attachments",
            files={"file": ("intruder.txt", file_data, "text/plain")},
            headers=auth_headers(unrelated_user),
        )

        assert resp.status_code == 403

    def test_admin_can_upload_and_download_attachment(self, client, db):
        """SUPER_ADMIN can upload and download attachments from any ticket."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_ATT_09")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        file_data = io.BytesIO(b"admin test data")
        upload_resp = client.post(
            f"/api/tickets/{ticket.id}/attachments",
            files={"file": ("admin_check.txt", file_data, "text/plain")},
            headers=auth_headers(admin),
        )
        assert upload_resp.status_code == 201
        att_id = upload_resp.json()["id"]

        download_resp = client.get(
            f"/api/attachments/{att_id}/download",
            headers=auth_headers(admin),
        )
        assert download_resp.status_code == 200
        assert download_resp.content == b"admin test data"

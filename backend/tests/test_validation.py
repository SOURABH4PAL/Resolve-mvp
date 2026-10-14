"""Tests for ticket creation validation."""

import pytest
from tests.conftest import (
    make_user, make_admin, make_department, make_category, make_subcategory,
    make_ticket, auth_headers
)


class TestValidation:
    """Validate title, description, category, and subcategory constraints."""

    def test_create_ticket_success(self, client, db):
        """Happy path: all fields valid."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP040")

        resp = client.post(
            "/api/tickets",
            json={
                "title": "My first ticket",
                "description": "Something is broken",
                "category_id": cat.id,
            },
            headers=auth_headers(emp),
        )
        assert resp.status_code == 201, resp.json()
        data = resp.json()
        assert data["title"] == "My first ticket"
        assert data["status"] == "OPEN"

    def test_empty_title_rejected(self, client, db):
        """Blank title must be rejected with a validation error."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP041")

        resp = client.post(
            "/api/tickets",
            json={"title": "   ", "description": "Valid", "category_id": cat.id},
            headers=auth_headers(emp),
        )
        assert resp.status_code == 422

    def test_empty_description_rejected(self, client, db):
        """Blank description must be rejected."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP042")

        resp = client.post(
            "/api/tickets",
            json={"title": "Valid title", "description": "", "category_id": cat.id},
            headers=auth_headers(emp),
        )
        assert resp.status_code == 422

    def test_nonexistent_category_rejected(self, client, db):
        """Using a category ID that does not exist returns 422."""
        emp = make_user(db, employee_id="EMP043")

        resp = client.post(
            "/api/tickets",
            json={
                "title": "Valid title",
                "description": "Valid description",
                "category_id": "00000000-0000-0000-0000-000000000000",
            },
            headers=auth_headers(emp),
        )
        assert resp.status_code == 422

    def test_subcategory_must_belong_to_category(self, client, db):
        """Subcategory from a different category must be rejected."""
        dept = make_department(db)
        cat_a = make_category(db, dept.id, name="CatA")
        cat_b = make_category(db, dept.id, name="CatB")
        sub_b = make_subcategory(db, cat_b.id, name="SubB")
        emp = make_user(db, employee_id="EMP044")

        resp = client.post(
            "/api/tickets",
            json={
                "title": "Title",
                "description": "Desc",
                "category_id": cat_a.id,
                "subcategory_id": sub_b.id,   # belongs to cat_b, not cat_a
            },
            headers=auth_headers(emp),
        )
        assert resp.status_code == 422

    def test_valid_subcategory_accepted(self, client, db):
        """A subcategory that belongs to the specified category is accepted."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        sub = make_subcategory(db, cat.id)
        emp = make_user(db, employee_id="EMP045")

        resp = client.post(
            "/api/tickets",
            json={
                "title": "Laptop broken",
                "description": "Screen is cracked",
                "category_id": cat.id,
                "subcategory_id": sub.id,
            },
            headers=auth_headers(emp),
        )
        assert resp.status_code == 201, resp.json()
        assert resp.json()["subcategory_id"] == sub.id

    def test_nonexistent_subcategory_rejected(self, client, db):
        """A subcategory ID that does not exist is rejected."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP046")

        resp = client.post(
            "/api/tickets",
            json={
                "title": "Title",
                "description": "Desc",
                "category_id": cat.id,
                "subcategory_id": "00000000-0000-0000-0000-000000000001",
            },
            headers=auth_headers(emp),
        )
        assert resp.status_code == 422

    def test_attachment_response_has_no_file_path(self, client, db):
        """Attachment response schema must never expose file_path / local paths."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP047")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        from io import BytesIO
        file_content = b"hello test content"
        resp = client.post(
            f"/api/tickets/{ticket.id}/attachments",
            files={"file": ("test.txt", BytesIO(file_content), "text/plain")},
            headers=auth_headers(emp),
        )
        assert resp.status_code == 201, resp.json()
        data = resp.json()
        assert "file_path" not in data
        assert "file_name" in data

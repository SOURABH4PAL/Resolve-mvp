"""
Automated tests for Module CRUD operations (Requirement 8).
Verifies Departments, Users, Comments, and Attachments CRUD & Authorization.
"""

import io
import pytest
from app.models.department import Department
from app.models.user import UserRole
from app.models.ticket_comment import TicketComment
from tests.conftest import (
    make_department,
    make_category,
    make_user,
    make_admin,
    make_ticket,
    auth_headers,
)


def test_department_crud_admin(client, db):
    admin = make_admin(db)

    # 1. Create Department
    create_resp = client.post(
        "/api/departments",
        json={"name": "Finance & Accounting", "department_email": "finance@resolvehub.com"},
        headers=auth_headers(admin),
    )
    assert create_resp.status_code == 201
    dept_id = create_resp.json()["id"]
    assert create_resp.json()["name"] == "Finance & Accounting"

    # 2. Get Department by ID
    get_resp = client.get(f"/api/departments/{dept_id}", headers=auth_headers(admin))
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Finance & Accounting"

    # 3. Update Department
    update_resp = client.put(
        f"/api/departments/{dept_id}",
        json={"name": "Finance & Payroll"},
        headers=auth_headers(admin),
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Finance & Payroll"

    # 4. Delete Department without relations
    del_resp = client.delete(f"/api/departments/{dept_id}", headers=auth_headers(admin))
    assert del_resp.status_code == 200
    assert del_resp.json().get("deleted") is True


def test_department_crud_employee_forbidden(client, db):
    dept = make_department(db)
    emp = make_user(db)

    # Attempt create
    res = client.post("/api/departments", json={"name": "Hacking"}, headers=auth_headers(emp))
    assert res.status_code == 403

    # Attempt update
    res = client.put(f"/api/departments/{dept.id}", json={"name": "Hacked"}, headers=auth_headers(emp))
    assert res.status_code == 403

    # Attempt delete
    res = client.delete(f"/api/departments/{dept.id}", headers=auth_headers(emp))
    assert res.status_code == 403


def test_department_safe_deletion_with_relations(client, db):
    dept = make_department(db, name="Operations")
    cat = make_category(db, dept.id, name="Field Ops")
    admin = make_admin(db)

    # Deleting department that has active categories
    del_resp = client.delete(f"/api/departments/{dept.id}", headers=auth_headers(admin))
    assert del_resp.status_code == 200
    assert del_resp.json().get("deactivated") is True

    db_dept = db.query(Department).filter(Department.id == dept.id).first()
    assert db_dept.is_active is False


def test_comment_deletion_lifecycle(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    author = make_user(db, employee_id="EMP001", name="Author")
    other_emp = make_user(db, employee_id="EMP002", name="Stranger")
    admin = make_admin(db)
    ticket = make_ticket(db, author, cat.id)

    # Add comment by author
    add_resp = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"content": "Author note to delete", "is_internal": False},
        headers=auth_headers(author),
    )
    assert add_resp.status_code == 201
    comment_id = add_resp.json()["id"]

    # Other employee cannot delete
    fail_del = client.delete(
        f"/api/tickets/{ticket.id}/comments/{comment_id}",
        headers=auth_headers(other_emp),
    )
    assert fail_del.status_code == 403

    # Author can delete their own comment
    succ_del = client.delete(
        f"/api/tickets/{ticket.id}/comments/{comment_id}",
        headers=auth_headers(author),
    )
    assert succ_del.status_code == 200
    assert succ_del.json().get("deleted") is True

    # Admin can delete comment
    add_resp2 = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"content": "Admin target note", "is_internal": False},
        headers=auth_headers(author),
    )
    admin_del = client.delete(
        f"/api/tickets/{ticket.id}/comments/{add_resp2.json()['id']}",
        headers=auth_headers(admin),
    )
    assert admin_del.status_code == 200


def test_attachment_detail_and_delete_lifecycle(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    emp = make_user(db, employee_id="EMP10", name="Uploader")
    stranger = make_user(db, employee_id="EMP20", name="Stranger")
    ticket = make_ticket(db, emp, cat.id)

    # Upload attachment
    file_bytes = b"Sample diagnostic log file content"
    files = {"file": ("diagnostic.txt", io.BytesIO(file_bytes), "text/plain")}
    up_resp = client.post(
        f"/api/tickets/{ticket.id}/attachments",
        files=files,
        headers=auth_headers(emp),
    )
    assert up_resp.status_code == 201
    att_id = up_resp.json()["id"]

    # Get attachment detail
    det_resp = client.get(
        f"/api/tickets/{ticket.id}/attachments/{att_id}",
        headers=auth_headers(emp),
    )
    assert det_resp.status_code == 200
    assert det_resp.json()["file_name"] == "diagnostic.txt"

    # Stranger cannot delete
    fail_del = client.delete(
        f"/api/tickets/{ticket.id}/attachments/{att_id}",
        headers=auth_headers(stranger),
    )
    assert fail_del.status_code == 403

    # Uploader can delete
    succ_del = client.delete(
        f"/api/tickets/{ticket.id}/attachments/{att_id}",
        headers=auth_headers(emp),
    )
    assert succ_del.status_code == 200
    assert succ_del.json().get("deleted") is True


def test_user_management_and_status(client, db):
    admin = make_admin(db)
    emp = make_user(db, employee_id="EMP55", name="Target Employee")

    # Get User by ID
    get_resp = client.get(f"/api/users/{emp.id}", headers=auth_headers(admin))
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Target Employee"

    # Deactivate Employee
    deact_resp = client.put(
        f"/api/users/{emp.id}/status",
        json={"is_active": False},
        headers=auth_headers(admin),
    )
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False

    # Admin self-deactivation rejected
    self_deact = client.put(
        f"/api/users/{admin.id}/status",
        json={"is_active": False},
        headers=auth_headers(admin),
    )
    assert self_deact.status_code == 400

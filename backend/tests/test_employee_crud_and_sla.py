"""
Tests for Admin Employee CRUD and SLA Breach Escalation.
"""
from datetime import datetime, timedelta
import pytest
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.ticket import Ticket, TicketPriority, TicketStatus
from app.models.ticket_escalation import TicketEscalation
from tests.conftest import (
    make_department,
    make_category,
    make_user,
    make_admin,
    make_ticket,
    auth_headers,
)


def test_admin_can_create_employee(client, db):
    admin = make_admin(db)
    dept = make_department(db, name="QA Operations")

    response = client.post(
        "/api/users",
        json={
            "employee_id": "EMP-QA-001",
            "name": "QA Tester",
            "email": "tester@example.com",
            "password": "Password123!",
            "role": "EMPLOYEE",
            "department_id": dept.id,
            "is_active": True,
        },
        headers=auth_headers(admin),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "QA Tester"
    assert data["email"] == "tester@example.com"
    assert data["employee_id"] == "EMP-QA-001"
    assert data["role"] == "EMPLOYEE"
    assert data["department_id"] == dept.id


def test_duplicate_email_or_employee_id_rejected(client, db):
    admin = make_admin(db)
    emp = make_user(db, employee_id="EMP-EXIST-01", email="existing@example.com")

    # Duplicate email
    resp1 = client.post(
        "/api/users",
        json={
            "employee_id": "EMP-NEW-02",
            "name": "Duplicate Email",
            "email": "existing@example.com",
            "password": "Password123!",
        },
        headers=auth_headers(admin),
    )
    assert resp1.status_code == 409

    # Duplicate employee_id
    resp2 = client.post(
        "/api/users",
        json={
            "employee_id": "EMP-EXIST-01",
            "name": "Duplicate ID",
            "email": "newunique@example.com",
            "password": "Password123!",
        },
        headers=auth_headers(admin),
    )
    assert resp2.status_code == 409


def test_admin_can_update_employee(client, db):
    admin = make_admin(db)
    emp = make_user(db, employee_id="EMP-EDIT-01", name="Original Name")

    response = client.put(
        f"/api/users/{emp.id}",
        json={
            "name": "Updated Name",
            "is_active": False,
        },
        headers=auth_headers(admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["is_active"] is False


def test_admin_cannot_delete_self(client, db):
    admin = make_admin(db)
    response = client.delete(
        f"/api/users/{admin.id}",
        headers=auth_headers(admin),
    )
    assert response.status_code == 400


def test_delete_employee_without_activity_deletes_record(client, db):
    admin = make_admin(db)
    emp = make_user(db, employee_id="EMP-DEL-01")

    response = client.delete(
        f"/api/users/{emp.id}",
        headers=auth_headers(admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] is True
    assert db.query(User).filter(User.id == emp.id).first() is None


def test_delete_employee_with_activity_deactivates_record(client, db):
    admin = make_admin(db)
    dept = make_department(db)
    cat = make_category(db, dept.id)
    emp = make_user(db, employee_id="EMP-DEL-02")
    make_ticket(db, emp, cat.id)

    response = client.delete(
        f"/api/users/{emp.id}",
        headers=auth_headers(admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["deactivated"] is True

    updated_emp = db.query(User).filter(User.id == emp.id).first()
    assert updated_emp is not None
    assert updated_emp.is_active is False


def test_sla_breach_auto_escalation_endpoint(client, db):
    admin = make_admin(db)
    dept = make_department(db, name="Escalation Dept")
    cat = make_category(db, dept.id)
    emp = make_user(db, employee_id="EMP-SLA-01")

    # Create ticket past response_due_at with no first response
    t = make_ticket(db, emp, cat.id, status=TicketStatus.OPEN)
    t.priority = TicketPriority.CRITICAL
    t.response_due_at = datetime.utcnow() - timedelta(hours=5)
    t.first_responded_at = None
    db.commit()

    response = client.post(
        "/api/sla-policies/check-escalations",
        headers=auth_headers(admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["newly_escalated_count"] >= 1

    # Verify escalation was logged
    esc = db.query(TicketEscalation).filter(
        TicketEscalation.ticket_id == t.id,
        TicketEscalation.escalation_type == "SLA_RESPONSE_BREACH",
    ).first()
    assert esc is not None
    assert "SLA Response Breach" in esc.reason

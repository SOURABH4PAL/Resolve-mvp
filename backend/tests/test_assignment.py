"""Tests for PUT /api/tickets/{ticket_id}/assign"""

import pytest
from tests.conftest import (
    make_user, make_admin, make_department, make_category, make_ticket, auth_headers
)
from app.models.ticket import TicketStatus


class TestAssignTicket:
    def test_admin_can_assign_ticket(self, client, db):
        """SUPER_ADMIN successfully assigns ticket to an active employee."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP001")
        ticket = make_ticket(db, creator=employee, category_id=cat.id)

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assignee_id": employee.id},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 200, resp.json()
        data = resp.json()
        assert data["assigned_to"] == employee.id
        assert data["status"] == TicketStatus.ASSIGNED.value

    def test_assign_sets_status_to_assigned_when_open(self, client, db):
        """Assigning an OPEN ticket auto-advances status to ASSIGNED."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP002")
        ticket = make_ticket(db, creator=employee, category_id=cat.id, status=TicketStatus.OPEN)

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assignee_id": employee.id},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == TicketStatus.ASSIGNED.value

    def test_assign_does_not_change_status_if_already_in_progress(self, client, db):
        """Assigning a ticket already IN_PROGRESS should not reset its status."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP003")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.IN_PROGRESS, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assignee_id": employee.id},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == TicketStatus.IN_PROGRESS.value

    def test_employee_cannot_assign_ticket(self, client, db):
        """Regular EMPLOYEE is forbidden from assigning tickets."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP004")
        ticket = make_ticket(db, creator=employee, category_id=cat.id)

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assignee_id": employee.id},
            headers=auth_headers(employee),
        )

        assert resp.status_code == 403

    def test_unauthenticated_cannot_assign(self, client, db):
        """Unauthenticated requests are rejected with 401."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP005")
        ticket = make_ticket(db, creator=employee, category_id=cat.id)

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assignee_id": employee.id},
        )

        assert resp.status_code == 401

    def test_assign_to_inactive_user_rejected(self, client, db):
        """Assigning to an inactive employee returns 422."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        inactive_emp = make_user(db, employee_id="EMP006", is_active=False)
        creator = make_user(db, employee_id="EMP007")
        ticket = make_ticket(db, creator=creator, category_id=cat.id)

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assignee_id": inactive_emp.id},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 422

    def test_assign_nonexistent_user_rejected(self, client, db):
        """Assigning to a non-existent user ID returns 422."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP008")
        ticket = make_ticket(db, creator=employee, category_id=cat.id)

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assignee_id": "non-existent-id"},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 422

    def test_assign_creates_system_comment(self, client, db):
        """System comment is recorded when ticket is assigned."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP009", name="Bob")
        ticket = make_ticket(db, creator=employee, category_id=cat.id)

        client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assignee_id": employee.id},
            headers=auth_headers(admin),
        )

        comments_resp = client.get(
            f"/api/tickets/{ticket.id}/comments",
            headers=auth_headers(admin),
        )
        assert comments_resp.status_code == 200
        comments = comments_resp.json()
        assert any("assigned" in c["content"].lower() or "Bob" in c["content"] for c in comments)

    def test_assign_using_assigned_to_user_id_field(self, client, db):
        """Admin can assign using assigned_to_user_id payload field."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP010", name="Dan")
        ticket = make_ticket(db, creator=employee, category_id=cat.id)

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assigned_to_user_id": employee.id},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 200, resp.json()
        data = resp.json()
        assert data["assigned_to"] == employee.id
        assert data["assigned_to_user_id"] == employee.id
        assert data["status"] == TicketStatus.ASSIGNED.value

    def test_assign_to_admin_rejected(self, client, db):
        """Tickets cannot be assigned to another SUPER_ADMIN — only to EMPLOYEE."""
        admin1 = make_admin(db, employee_id="ADM002", name="Admin 1")
        admin2 = make_admin(db, employee_id="ADM003", name="Admin 2")
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP011")
        ticket = make_ticket(db, creator=employee, category_id=cat.id)

        resp = client.put(
            f"/api/tickets/{ticket.id}/assign",
            json={"assigned_to_user_id": admin2.id},
            headers=auth_headers(admin1),
        )

        assert resp.status_code == 422


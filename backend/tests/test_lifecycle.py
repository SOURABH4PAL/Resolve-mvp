"""Tests for ticket lifecycle state transitions."""

import pytest
from tests.conftest import (
    make_user, make_admin, make_department, make_category, make_ticket, auth_headers
)
from app.models.ticket import TicketStatus


class TestLifecycleTransitions:
    """Valid path: OPEN → ASSIGNED → IN_PROGRESS → WAITING_FOR_USER → RESOLVED → CLOSED"""

    def test_open_to_in_progress_by_assigned_employee(self, client, db):
        """Assigned employee can move OPEN ticket to IN_PROGRESS directly."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP010")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.OPEN, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "IN_PROGRESS"},
            headers=auth_headers(employee),
        )

        assert resp.status_code == 200, resp.json()
        assert resp.json()["status"] == "IN_PROGRESS"

    def test_in_progress_to_resolved(self, client, db):
        """Assigned employee can resolve an IN_PROGRESS ticket."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP011")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.IN_PROGRESS, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "RESOLVED"},
            headers=auth_headers(employee),
        )

        assert resp.status_code == 200, resp.json()
        assert resp.json()["status"] == "RESOLVED"

    def test_resolved_to_closed_by_creator(self, client, db):
        """Creator can close ticket after it is RESOLVED."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP012")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.RESOLVED, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/close",
            headers=auth_headers(employee),
        )

        assert resp.status_code == 200, resp.json()
        assert resp.json()["status"] == "CLOSED"

    def test_in_progress_to_waiting_for_user(self, client, db):
        """Assigned employee can set ticket to WAITING_FOR_USER."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP013")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.IN_PROGRESS, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "WAITING_FOR_USER"},
            headers=auth_headers(employee),
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "WAITING_FOR_USER"

    def test_invalid_transition_open_to_resolved_rejected(self, client, db):
        """Jumping from OPEN directly to RESOLVED is not allowed."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP014")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.OPEN, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "RESOLVED"},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 422

    def test_closed_ticket_cannot_be_transitioned(self, client, db):
        """A CLOSED ticket is terminal — no further transitions allowed."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP015")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.CLOSED, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "OPEN"},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 422

    def test_resolved_to_in_progress_by_admin(self, client, db):
        """Admin can reopen a RESOLVED ticket back to IN_PROGRESS."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP016")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.RESOLVED, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "IN_PROGRESS"},
            headers=auth_headers(admin),
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "IN_PROGRESS"

    def test_admin_can_close_in_progress_ticket(self, client, db):
        """Admin can close a ticket from any non-terminal state."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP017")
        ticket = make_ticket(
            db, creator=employee, category_id=cat.id,
            status=TicketStatus.IN_PROGRESS, assigned_to=employee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/close",
            headers=auth_headers(admin),
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "CLOSED"

    def test_resolved_to_reopened_by_creator(self, client, db):
        """Creator can reopen a RESOLVED ticket with REOPENED status."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        creator = make_user(db, employee_id="EMP018")
        assignee = make_user(db, employee_id="EMP019")
        ticket = make_ticket(
            db, creator=creator, category_id=cat.id,
            status=TicketStatus.RESOLVED, assigned_to=assignee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "REOPENED", "comment": "Issue still persists."},
            headers=auth_headers(creator),
        )

        assert resp.status_code == 200, resp.json()
        assert resp.json()["status"] == "REOPENED"

    def test_creator_can_reopen_resolved_ticket_to_in_progress(self, client, db):
        """Creator can reopen a RESOLVED ticket directly to IN_PROGRESS."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        creator = make_user(db, employee_id="EMP019A")
        assignee = make_user(db, employee_id="EMP019B")
        ticket = make_ticket(
            db, creator=creator, category_id=cat.id,
            status=TicketStatus.RESOLVED, assigned_to=assignee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "IN_PROGRESS", "comment": "Please look again."},
            headers=auth_headers(creator),
        )

        assert resp.status_code == 200, resp.json()
        assert resp.json()["status"] == "IN_PROGRESS"


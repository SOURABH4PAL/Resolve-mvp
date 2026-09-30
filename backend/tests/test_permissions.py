"""Tests for permission enforcement on ticket actions."""

import pytest
from tests.conftest import (
    make_user, make_admin, make_department, make_category, make_ticket, auth_headers
)
from app.models.ticket import TicketStatus


class TestPermissions:
    """Verify that only authorized actors can perform each action."""

    # ---- GET /api/users ------------------------------------------------

    def test_admin_can_list_employees(self, client, db):
        """SUPER_ADMIN gets a list of active employees."""
        admin = make_admin(db)
        emp1 = make_user(db, employee_id="EMP020", name="Charlie")
        emp2 = make_user(db, employee_id="EMP021", name="Dana")

        resp = client.get("/api/users", headers=auth_headers(admin))
        assert resp.status_code == 200
        ids = [u["id"] for u in resp.json()]
        assert emp1.id in ids
        assert emp2.id in ids
        # Admin should NOT appear (role=SUPER_ADMIN)
        assert admin.id not in ids

    def test_employee_cannot_list_users(self, client, db):
        """Regular employee is forbidden from GET /api/users."""
        emp = make_user(db, employee_id="EMP022")
        resp = client.get("/api/users", headers=auth_headers(emp))
        assert resp.status_code == 403

    def test_inactive_employees_excluded_from_list(self, client, db):
        """Inactive employees must not appear in the dropdown."""
        admin = make_admin(db)
        active = make_user(db, employee_id="EMP023", is_active=True)
        inactive = make_user(db, employee_id="EMP024", is_active=False)

        resp = client.get("/api/users", headers=auth_headers(admin))
        ids = [u["id"] for u in resp.json()]
        assert active.id in ids
        assert inactive.id not in ids

    # ---- Work transitions / resolve --------------------------------

    def test_non_assigned_employee_cannot_change_status_to_in_progress(self, client, db):
        """A different (non-assigned) employee cannot change status."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        creator = make_user(db, employee_id="EMP025")
        other_emp = make_user(db, employee_id="EMP026")
        ticket = make_ticket(
            db, creator=creator, category_id=cat.id,
            status=TicketStatus.ASSIGNED, assigned_to=creator.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "IN_PROGRESS"},
            headers=auth_headers(other_emp),
        )
        # other_emp has no access to this ticket at all (403 from get_ticket_by_id)
        assert resp.status_code == 403

    def test_creator_cannot_resolve_ticket(self, client, db):
        """Ticket creator (if not assigned) cannot resolve their own ticket."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        creator = make_user(db, employee_id="EMP027")
        assignee = make_user(db, employee_id="EMP028")
        ticket = make_ticket(
            db, creator=creator, category_id=cat.id,
            status=TicketStatus.IN_PROGRESS, assigned_to=assignee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/resolve",
            json={},
            headers=auth_headers(creator),
        )
        assert resp.status_code == 403

    def test_assigned_employee_can_resolve(self, client, db):
        """Assigned employee can resolve their ticket."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        creator = make_user(db, employee_id="EMP029")
        assignee = make_user(db, employee_id="EMP030")
        ticket = make_ticket(
            db, creator=creator, category_id=cat.id,
            status=TicketStatus.IN_PROGRESS, assigned_to=assignee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/resolve",
            json={"resolution_notes": "Fixed the issue"},
            headers=auth_headers(assignee),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "RESOLVED"

    def test_creator_cannot_close_unresolved_ticket(self, client, db):
        """Creator can only close after RESOLVED; IN_PROGRESS close should be rejected."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        creator = make_user(db, employee_id="EMP031")
        assignee = make_user(db, employee_id="EMP032")
        ticket = make_ticket(
            db, creator=creator, category_id=cat.id,
            status=TicketStatus.IN_PROGRESS, assigned_to=assignee.id,
        )

        resp = client.put(
            f"/api/tickets/{ticket.id}/close",
            headers=auth_headers(creator),
        )
        assert resp.status_code == 422

    def test_admin_can_close_any_ticket(self, client, db):
        """SUPER_ADMIN can close a ticket regardless of status."""
        admin = make_admin(db)
        dept = make_department(db)
        cat = make_category(db, dept.id)
        employee = make_user(db, employee_id="EMP033")
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

    def test_unassigned_employee_cannot_start_work(self, client, db):
        """An employee who is not the assignee cannot set status to IN_PROGRESS."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        creator = make_user(db, employee_id="EMP034")
        other = make_user(db, employee_id="EMP035")
        assignee = make_user(db, employee_id="EMP036")
        ticket = make_ticket(
            db, creator=creator, category_id=cat.id,
            status=TicketStatus.ASSIGNED, assigned_to=assignee.id,
        )

        # 'other' cannot access this ticket at all
        resp = client.put(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "IN_PROGRESS"},
            headers=auth_headers(other),
        )
        assert resp.status_code == 403

"""
Unit and integration tests for ResolveHub MVP Enhancements:
1. Bulk employee department assignment
2. Admin ticket blocking & unblocking lifecycle
3. Ticket creation with 'Any' / omitted category preference
4. Ticket Journey audit timeline retrieval
5. SLA Summary and department-wise SLA performance calculations
"""

import pytest
from datetime import datetime, timedelta
from tests.conftest import (
    make_user,
    make_admin,
    make_department,
    make_category,
    make_subcategory,
    auth_headers,
)
from app.models.ticket import TicketPriority, TicketStatus


class TestResolveHubMvpEnhancements:
    @pytest.fixture(autouse=True)
    def setup_data(self, client, db):
        self.dept_it = make_department(db, name="IT Operations")
        self.dept_hr = make_department(db, name="HR Operations")
        self.cat_it = make_category(db, self.dept_it.id, name="Hardware")
        self.subcat_it = make_subcategory(db, self.cat_it.id, name="Monitors")

        self.admin = make_admin(db, employee_id="ADM_ENH_01", name="Admin Lead")
        self.emp1 = make_user(db, employee_id="EMP_ENH_01", name="Employee One")
        self.emp2 = make_user(db, employee_id="EMP_ENH_02", name="Employee Two")

        self.admin_headers = auth_headers(self.admin)
        self.emp1_headers = auth_headers(self.emp1)
        self.emp2_headers = auth_headers(self.emp2)

    # 1. Bulk Employee Department Assignment
    def test_bulk_assign_department_success(self, client):
        resp = client.post(
            "/api/users/bulk-assign-department",
            json={
                "user_ids": [self.emp1.id, self.emp2.id],
                "department_id": self.dept_it.id,
            },
            headers=self.admin_headers,
        )
        assert resp.status_code == 200, resp.json()
        data = resp.json()
        assert data["updated_count"] == 2
        assert data["failed_count"] == 0
        assert set(data["successful_user_ids"]) == {self.emp1.id, self.emp2.id}

    def test_bulk_assign_department_forbidden_for_employee(self, client):
        resp = client.post(
            "/api/users/bulk-assign-department",
            json={
                "user_ids": [self.emp2.id],
                "department_id": self.dept_it.id,
            },
            headers=self.emp1_headers,
        )
        assert resp.status_code == 403

    def test_bulk_assign_department_empty_list_rejected(self, client):
        resp = client.post(
            "/api/users/bulk-assign-department",
            json={
                "user_ids": [],
                "department_id": self.dept_it.id,
            },
            headers=self.admin_headers,
        )
        assert resp.status_code == 400

    # 2. Ticket Blocking & Unblocking
    def test_admin_block_and_unblock_ticket(self, client):
        # Create a ticket
        create_resp = client.post(
            "/api/tickets",
            json={
                "title": "Network connectivity dropping",
                "description": "WiFi disconnects randomly every 15 minutes",
                "category_id": self.cat_it.id,
                "priority": "HIGH",
            },
            headers=self.emp1_headers,
        )
        assert create_resp.status_code == 201
        t = create_resp.json()
        ticket_id = t["id"]

        # Employee cannot block
        block_fail = client.put(
            f"/api/tickets/{ticket_id}/block",
            json={"reason": "Waiting for vendor"},
            headers=self.emp1_headers,
        )
        assert block_fail.status_code == 403

        # Admin blocks ticket
        block_resp = client.put(
            f"/api/tickets/{ticket_id}/block",
            json={"reason": "Pending hardware audit from global procurement"},
            headers=self.admin_headers,
        )
        assert block_resp.status_code == 200
        blocked_data = block_resp.json()
        assert blocked_data["is_blocked"] is True
        assert blocked_data["blocked_reason"] == "Pending hardware audit from global procurement"

        # While blocked, status update must be rejected
        status_fail = client.put(
            f"/api/tickets/{ticket_id}/status",
            json={"status": "IN_PROGRESS"},
            headers=self.admin_headers,
        )
        assert status_fail.status_code == 400
        assert "BLOCKED" in status_fail.json()["detail"]

        # Admin unblocks ticket
        unblock_resp = client.put(
            f"/api/tickets/{ticket_id}/unblock",
            json={"reason": "Audit completed, resuming work"},
            headers=self.admin_headers,
        )
        assert unblock_resp.status_code == 200
        unblocked_data = unblock_resp.json()
        assert unblocked_data["is_blocked"] is False
        assert unblocked_data["blocked_reason"] is None

        # Work can now proceed
        status_ok = client.put(
            f"/api/tickets/{ticket_id}/status",
            json={"status": "IN_PROGRESS"},
            headers=self.admin_headers,
        )
        assert status_ok.status_code == 200
        assert status_ok.json()["status"] == "IN_PROGRESS"

    # 3. Ticket Creation with 'Any' / Omitted Category
    def test_create_ticket_with_any_category(self, client):
        resp = client.post(
            "/api/tickets",
            json={
                "title": "General inquiry about office access",
                "description": "Need to know the weekend building hours and badge policy",
                "category_id": "ANY",
                "priority": "LOW",
            },
            headers=self.emp1_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["category_id"] is None
        assert data["category"] is None
        assert data["priority"] == "LOW"

    # 4. Ticket Journey Chronological Timeline
    def test_ticket_journey_retrieval(self, client):
        create_resp = client.post(
            "/api/tickets",
            json={
                "title": "Broken HDMI cable in room 302",
                "description": "Cable pins are bent and monitor shows black screen",
                "category_id": self.cat_it.id,
                "priority": "MEDIUM",
            },
            headers=self.emp1_headers,
        )
        ticket_id = create_resp.json()["id"]

        # Assign to emp2
        client.put(
            f"/api/tickets/{ticket_id}/assign",
            json={"assignee_id": self.emp2.id},
            headers=self.admin_headers,
        )

        # Retrieve journey
        journey_resp = client.get(
            f"/api/tickets/{ticket_id}/journey",
            headers=self.emp1_headers,
        )
        assert journey_resp.status_code == 200
        events = journey_resp.json()
        assert len(events) >= 2
        event_types = [e["event_type"] for e in events]
        assert "CREATED" in event_types
        assert "ASSIGNED" in event_types

    # 5. SLA Summary & Department SLA Reporting
    def test_dashboard_report_includes_sla_summary(self, client):
        resp = client.get("/api/reports/dashboard", headers=self.admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "sla_summary" in data
        assert "department_sla" in data
        assert isinstance(data["sla_summary"]["compliance_percentage"], (int, float))
        assert isinstance(data["department_sla"], list)

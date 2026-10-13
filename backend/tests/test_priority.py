"""Tests for Requirement 3: Ticket Priority During Ticket Creation, Validation, and Filtering."""

import pytest
from tests.conftest import (
    make_user, make_admin, make_department, make_category, make_ticket, auth_headers
)
from app.models.ticket import Ticket, TicketPriority, TicketStatus


class TestTicketPriority:
    @pytest.mark.parametrize("priority_val", ["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    def test_create_ticket_with_each_supported_priority(self, client, db, priority_val):
        """Ticket can be created with each supported priority: LOW, MEDIUM, HIGH, CRITICAL."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id=f"EMP_PRIO_{priority_val}")

        payload = {
            "title": f"Test issue with priority {priority_val}",
            "description": f"Detailed description for issue with priority {priority_val}",
            "category_id": cat.id,
            "priority": priority_val,
        }
        resp = client.post("/api/tickets", json=payload, headers=auth_headers(emp))
        assert resp.status_code == 201, resp.json()
        data = resp.json()
        assert data["priority"] == priority_val

        # Verify saved in database
        saved = db.query(Ticket).filter(Ticket.id == data["id"]).first()
        assert saved is not None
        assert saved.priority == TicketPriority(priority_val)

    def test_create_ticket_omitted_priority_defaults_to_medium(self, client, db):
        """When priority is omitted from request body, it safely defaults to MEDIUM."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_PRIO_DEF")

        payload = {
            "title": "Default priority ticket",
            "description": "Ticket created without providing explicit priority",
            "category_id": cat.id,
        }
        resp = client.post("/api/tickets", json=payload, headers=auth_headers(emp))
        assert resp.status_code == 201, resp.json()
        data = resp.json()
        assert data["priority"] == TicketPriority.MEDIUM.value

        saved = db.query(Ticket).filter(Ticket.id == data["id"]).first()
        assert saved.priority == TicketPriority.MEDIUM

    def test_create_ticket_invalid_priority_rejected(self, client, db):
        """Arbitrary or non-standard priority values (e.g. URGENT, SEVERE) are rejected with 422."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_PRIO_INV")

        payload = {
            "title": "Invalid priority ticket",
            "description": "Ticket created with invalid priority value",
            "category_id": cat.id,
            "priority": "URGENT",  # URGENT is invalid in ResolveHub
        }
        resp = client.post("/api/tickets", json=payload, headers=auth_headers(emp))
        assert resp.status_code == 422

    def test_filter_tickets_by_priority(self, client, db):
        """GET /api/tickets?priority=HIGH returns only tickets matching the requested priority."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_PRIO_FILTER")

        # Create 1 HIGH ticket and 1 LOW ticket
        t1 = make_ticket(db, creator=emp, category_id=cat.id)
        t1.priority = TicketPriority.HIGH
        t2 = make_ticket(db, creator=emp, category_id=cat.id)
        t2.priority = TicketPriority.LOW
        db.commit()

        # Query HIGH
        resp_high = client.get("/api/tickets?priority=HIGH", headers=auth_headers(emp))
        assert resp_high.status_code == 200
        items_high = resp_high.json()
        assert len(items_high) == 1
        assert items_high[0]["id"] == t1.id
        assert items_high[0]["priority"] == "HIGH"

        # Query LOW
        resp_low = client.get("/api/tickets?priority=LOW", headers=auth_headers(emp))
        assert resp_low.status_code == 200
        items_low = resp_low.json()
        assert len(items_low) == 1
        assert items_low[0]["id"] == t2.id
        assert items_low[0]["priority"] == "LOW"

    def test_backward_compatible_ticket_read_fallback(self, client, db):
        """Tickets with existing priority read back correctly via GET /api/tickets/{id}."""
        dept = make_department(db)
        cat = make_category(db, dept.id)
        emp = make_user(db, employee_id="EMP_PRIO_READ")
        ticket = make_ticket(db, creator=emp, category_id=cat.id)

        resp = client.get(f"/api/tickets/{ticket.id}", headers=auth_headers(emp))
        assert resp.status_code == 200
        data = resp.json()
        assert data["priority"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

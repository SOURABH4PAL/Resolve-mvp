"""
Automated tests for Priority-Based SLA Policy (Requirement 11).
"""

from datetime import datetime, timedelta
import pytest
from app.models.ticket import Ticket, TicketPriority, TicketStatus
from tests.conftest import (
    make_department,
    make_category,
    make_user,
    make_admin,
    make_ticket,
    auth_headers,
)


def test_sla_deadlines_calculated_on_creation(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    emp = make_user(db)

    priorities_expected_hours = [
        (TicketPriority.CRITICAL, 1, 4),
        (TicketPriority.HIGH, 2, 8),
        (TicketPriority.MEDIUM, 4, 24),
        (TicketPriority.LOW, 8, 48),
    ]

    for prio, resp_h, res_h in priorities_expected_hours:
        before_creation = datetime.utcnow()
        response = client.post(
            "/api/tickets",
            json={
                "title": f"Test {prio.value} SLA",
                "description": "Validating SLA deadline hours",
                "category_id": cat.id,
                "priority": prio.value,
            },
            headers=auth_headers(emp),
        )
        assert response.status_code == 201
        data = response.json()

        assert data["priority"] == prio.value
        assert data["sla_status"] == "IN_SLA"
        assert data["response_due_at"] is not None
        assert data["resolution_due_at"] is not None

        resp_due = datetime.fromisoformat(data["response_due_at"].replace("Z", "+00:00")).replace(tzinfo=None)
        res_due = datetime.fromisoformat(data["resolution_due_at"].replace("Z", "+00:00")).replace(tzinfo=None)

        # Allow small execution delta tolerance (5 minutes)
        resp_diff = (resp_due - before_creation).total_seconds() / 3600.0
        res_diff = (res_due - before_creation).total_seconds() / 3600.0
        assert abs(resp_diff - resp_h) < 0.1
        assert abs(res_diff - res_h) < 0.1


def test_sla_first_responded_at_tracking(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    creator = make_user(db, employee_id="EMP01", name="Ticket Creator")
    assignee = make_user(db, employee_id="EMP02", name="Assignee")
    admin = make_admin(db)

    # 1. Ticket created -> first_responded_at is None
    create_resp = client.post(
        "/api/tickets",
        json={"title": "Printer Jam", "description": "3rd floor printer jammed", "category_id": cat.id},
        headers=auth_headers(creator),
    )
    ticket_id = create_resp.json()["id"]
    assert create_resp.json()["first_responded_at"] is None

    # 2. Assignment sets first_responded_at
    client.put(
        f"/api/tickets/{ticket_id}/assign",
        json={"assignee_id": assignee.id},
        headers=auth_headers(admin),
    )
    t_after_assign = client.get(f"/api/tickets/{ticket_id}", headers=auth_headers(creator)).json()
    assert t_after_assign["first_responded_at"] is not None


def test_sla_status_states_in_sla_at_risk_breached(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    emp = make_user(db)
    now = datetime.utcnow()

    # Case A: IN_SLA
    t_in = make_ticket(db, emp, cat.id, ticket_number="TKT-SLA-01")
    t_in.created_at = now
    t_in.resolution_due_at = now + timedelta(hours=20)
    db.commit()
    assert t_in.sla_status == "IN_SLA"

    # Case B: AT_RISK (remaining <= 25% of total window)
    t_risk = make_ticket(db, emp, cat.id, ticket_number="TKT-SLA-02")
    t_risk.created_at = now - timedelta(hours=20)
    t_risk.resolution_due_at = now + timedelta(hours=2) # 2h left of 22h total window (~9%)
    db.commit()
    assert t_risk.sla_status == "AT_RISK"

    # Case C: BREACHED (deadline already passed)
    t_breached = make_ticket(db, emp, cat.id, ticket_number="TKT-SLA-03")
    t_breached.created_at = now - timedelta(hours=30)
    t_breached.resolution_due_at = now - timedelta(hours=5)
    db.commit()
    assert t_breached.sla_status == "BREACHED"

    # Case D: RESOLVED within SLA
    t_resolved_ok = make_ticket(db, emp, cat.id, status=TicketStatus.RESOLVED, ticket_number="TKT-SLA-04")
    t_resolved_ok.created_at = now - timedelta(hours=10)
    t_resolved_ok.resolution_due_at = now + timedelta(hours=14)
    t_resolved_ok.resolved_at = now - timedelta(hours=2)
    db.commit()
    assert t_resolved_ok.sla_status == "IN_SLA"

    # Case E: RESOLVED after SLA breach
    t_resolved_late = make_ticket(db, emp, cat.id, status=TicketStatus.RESOLVED, ticket_number="TKT-SLA-05")
    t_resolved_late.created_at = now - timedelta(hours=30)
    t_resolved_late.resolution_due_at = now - timedelta(hours=10)
    t_resolved_late.resolved_at = now - timedelta(hours=2)
    db.commit()
    assert t_resolved_late.sla_status == "BREACHED"

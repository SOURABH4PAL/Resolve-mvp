"""
Automated tests for Dashboard Reports & Aggregations (Requirement 9).
"""

from datetime import datetime, timedelta
import pytest
from app.models.ticket import TicketStatus, TicketPriority
from tests.conftest import (
    make_department,
    make_category,
    make_user,
    make_admin,
    make_ticket,
    auth_headers,
)


def test_dashboard_report_empty(client, db):
    admin = make_admin(db)
    response = client.get("/api/reports/dashboard", headers=auth_headers(admin))
    assert response.status_code == 200
    data = response.json()

    assert data["summary"]["total_tickets"] == 0
    assert data["summary"]["open_tickets"] == 0
    assert data["summary"]["avg_resolution_hours"] == 0.0
    assert "status_distribution" in data
    assert "priority_distribution" in data
    assert "department_workload" in data
    assert "recent_trend" in data
    assert len(data["recent_trend"]) == 7


def test_dashboard_report_with_tickets(client, db):
    dept_it = make_department(db, name="IT Operations")
    dept_hr = make_department(db, name="Human Resources")
    cat_hw = make_category(db, dept_it.id, name="Hardware")
    cat_pay = make_category(db, dept_hr.id, name="Payroll")

    emp = make_user(db, employee_id="EMP001")
    assignee = make_user(db, employee_id="EMP002")
    admin = make_admin(db)

    # 1. Open Ticket in IT
    t1 = make_ticket(db, emp, cat_hw.id, status=TicketStatus.OPEN)
    t1.priority = TicketPriority.CRITICAL

    # 2. In-Progress Ticket in IT assigned to assignee
    t2 = make_ticket(db, emp, cat_hw.id, status=TicketStatus.IN_PROGRESS, assigned_to=assignee.id)
    t2.priority = TicketPriority.HIGH

    # 3. Resolved Ticket in HR
    t3 = make_ticket(db, emp, cat_pay.id, status=TicketStatus.RESOLVED, assigned_to=assignee.id)
    t3.priority = TicketPriority.LOW
    t3.created_at = datetime.utcnow() - timedelta(hours=4)
    t3.resolved_at = datetime.utcnow()

    # 4. Closed Ticket in HR
    t4 = make_ticket(db, emp, cat_pay.id, status=TicketStatus.CLOSED)
    t4.priority = TicketPriority.MEDIUM
    t4.created_at = datetime.utcnow() - timedelta(hours=6)
    t4.resolved_at = datetime.utcnow() - timedelta(hours=2)

    db.commit()

    response = client.get("/api/reports/dashboard", headers=auth_headers(admin))
    assert response.status_code == 200
    data = response.json()

    summary = data["summary"]
    assert summary["total_tickets"] == 4
    assert summary["open_tickets"] == 1
    assert summary["in_progress_tickets"] == 1
    assert summary["resolved_tickets"] == 1
    assert summary["closed_tickets"] == 1
    assert summary["unassigned_tickets"] == 2  # t1 and t4
    assert summary["avg_resolution_hours"] > 0

    # Status distribution
    assert data["status_distribution"]["OPEN"] == 1
    assert data["status_distribution"]["IN_PROGRESS"] == 1
    assert data["status_distribution"]["RESOLVED"] == 1
    assert data["status_distribution"]["CLOSED"] == 1

    # Priority distribution
    assert data["priority_distribution"]["CRITICAL"] == 1
    assert data["priority_distribution"]["HIGH"] == 1
    assert data["priority_distribution"]["LOW"] == 1
    assert data["priority_distribution"]["MEDIUM"] == 1

    # Department workload
    it_load = next(d for d in data["department_workload"] if d["department_name"] == "IT Operations")
    hr_load = next(d for d in data["department_workload"] if d["department_name"] == "Human Resources")
    assert it_load["total_tickets"] == 2
    assert it_load["open_tickets"] == 2
    assert hr_load["total_tickets"] == 2
    assert hr_load["resolved_tickets"] == 2

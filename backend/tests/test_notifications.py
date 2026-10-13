"""
Automated tests for In-app Notification System (Requirement 10).
"""

import pytest
from app.models.user import UserRole
from app.models.notification import Notification
from app.models.ticket import TicketStatus
from tests.conftest import (
    make_department,
    make_category,
    make_user,
    make_admin,
    make_ticket,
    auth_headers,
)


def test_notification_on_ticket_creation_and_listing(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    emp = make_user(db, employee_id="EMP01", name="Ticket Creator")
    admin1 = make_admin(db, employee_id="ADM01", name="Super Admin 1")
    admin2 = make_admin(db, employee_id="ADM02", name="Super Admin 2")

    # Employee creates ticket
    create_resp = client.post(
        "/api/tickets",
        json={"title": "VPN Failure", "description": "Cannot connect to corporate VPN", "category_id": cat.id},
        headers=auth_headers(emp),
    )
    assert create_resp.status_code == 201
    ticket_id = create_resp.json()["id"]

    # Verify both admins received notifications
    admin1_notifs = client.get("/api/notifications", headers=auth_headers(admin1)).json()
    assert len(admin1_notifs) == 1
    assert "VPN Failure" in admin1_notifs[0]["message"]
    assert admin1_notifs[0]["ticket_id"] == ticket_id
    assert admin1_notifs[0]["is_read"] is False

    admin2_notifs = client.get("/api/notifications", headers=auth_headers(admin2)).json()
    assert len(admin2_notifs) == 1

    # Employee did not receive admin notification
    emp_notifs = client.get("/api/notifications", headers=auth_headers(emp)).json()
    assert len(emp_notifs) == 0


def test_notification_on_assignment_and_resolution(client, db):
    dept = make_department(db)
    cat = make_category(db, dept.id)
    creator = make_user(db, employee_id="EMP11", name="Creator")
    assignee = make_user(db, employee_id="EMP12", name="Assignee")
    admin = make_admin(db, employee_id="ADM11")

    # 1. Creator logs ticket
    t_resp = client.post(
        "/api/tickets",
        json={"title": "Broken Monitor", "description": "Flickering display", "category_id": cat.id},
        headers=auth_headers(creator),
    )
    ticket_id = t_resp.json()["id"]

    # 2. Admin assigns ticket to Assignee
    assign_resp = client.put(
        f"/api/tickets/{ticket_id}/assign",
        json={"assignee_id": assignee.id},
        headers=auth_headers(admin),
    )
    assert assign_resp.status_code == 200

    # Assignee should receive notification
    assignee_notifs = client.get("/api/notifications", headers=auth_headers(assignee)).json()
    assert len(assignee_notifs) == 1
    assert "You have been assigned ticket" in assignee_notifs[0]["message"]

    # 3. Assignee starts progress then resolves ticket
    prog_resp = client.put(
        f"/api/tickets/{ticket_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=auth_headers(assignee),
    )
    assert prog_resp.status_code == 200

    resolve_resp = client.put(
        f"/api/tickets/{ticket_id}/resolve",
        json={"resolution_notes": "Replaced HDMI cable"},
        headers=auth_headers(assignee),
    )
    assert resolve_resp.status_code == 200

    # Creator should receive notification
    creator_notifs = client.get("/api/notifications", headers=auth_headers(creator)).json()
    assert len(creator_notifs) == 1
    assert "Broken Monitor" in creator_notifs[0]["message"]
    assert "resolved" in creator_notifs[0]["message"].lower()


def test_mark_as_read_endpoints(client, db):
    admin = make_admin(db)
    emp = make_user(db)
    dept = make_department(db)
    cat = make_category(db, dept.id)

    # Generate 2 tickets -> 2 notifications for admin
    client.post("/api/tickets", json={"title": "T1", "description": "D1", "category_id": cat.id}, headers=auth_headers(emp))
    client.post("/api/tickets", json={"title": "T2", "description": "D2", "category_id": cat.id}, headers=auth_headers(emp))

    notifs = client.get("/api/notifications", headers=auth_headers(admin)).json()
    assert len(notifs) == 2
    assert all(n["is_read"] is False for n in notifs)

    # Mark single as read
    target_id = notifs[0]["id"]
    read_resp = client.put(f"/api/notifications/{target_id}/read", headers=auth_headers(admin))
    assert read_resp.status_code == 200
    assert read_resp.json()["is_read"] is True

    # Filter unread_only
    unread_resp = client.get("/api/notifications?unread_only=true", headers=auth_headers(admin))
    assert unread_resp.status_code == 200
    assert len(unread_resp.json()) == 1

    # Mark all as read
    read_all_resp = client.put("/api/notifications/read-all", headers=auth_headers(admin))
    assert read_all_resp.status_code == 200
    assert read_all_resp.json()["count"] == 1

    # Now unread count is 0
    remaining_unread = client.get("/api/notifications?unread_only=true", headers=auth_headers(admin)).json()
    assert len(remaining_unread) == 0

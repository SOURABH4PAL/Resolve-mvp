import pytest
from app.models.user import UserRole
from app.models.ticket import TicketStatus
from app.models.faq import FAQ, FAQVote
from tests.conftest import (
    make_user,
    make_admin,
    make_department,
    make_category,
    make_subcategory,
    auth_headers,
)


def test_ticket_reopen_lifecycle_and_permissions(db, client):
    """Test Requirement 8 & 9: Ticket close & reopen permissions and lifecycle transitions."""
    dept = make_department(db, name="IT Services")
    cat = make_category(db, dept.id, name="Infrastructure")
    subcat = make_subcategory(db, cat.id, name="Server")

    creator = make_user(db, employee_id="EMP-CREATOR", name="Ticket Creator", role=UserRole.EMPLOYEE)
    assignee = make_user(db, employee_id="EMP-RESOLVER", name="Ticket Resolver", role=UserRole.EMPLOYEE)
    other_emp = make_user(db, employee_id="EMP-OTHER", name="Unrelated Employee", role=UserRole.EMPLOYEE)
    admin = make_admin(db, employee_id="ADM-SUPER", name="Super Admin")

    creator_h = auth_headers(creator)
    assignee_h = auth_headers(assignee)
    other_h = auth_headers(other_emp)
    admin_h = auth_headers(admin)

    # 1. Create a ticket as creator
    res = client.post(
        "/api/tickets",
        json={
            "title": "Server Crash Test",
            "description": "Investigate recurring crashes",
            "category_id": cat.id,
            "subcategory_id": subcat.id,
            "priority": "HIGH",
        },
        headers=creator_h,
    )
    assert res.status_code == 201
    ticket_id = res.json()["id"]

    # 2. Assign to assignee
    res = client.put(f"/api/tickets/{ticket_id}/assign", json={"assigned_to_user_id": assignee.id}, headers=admin_h)
    assert res.status_code == 200

    # 3. Work on ticket and resolve
    res = client.put(f"/api/tickets/{ticket_id}/status", json={"status": "IN_PROGRESS"}, headers=assignee_h)
    assert res.status_code == 200

    res = client.put(f"/api/tickets/{ticket_id}/resolve", json={"resolution_notes": "Patch applied"}, headers=assignee_h)
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"

    # 4. Assigned employee (resolver) can access ticket but CANNOT close it (HTTP 403)
    res = client.put(f"/api/tickets/{ticket_id}/close", headers=assignee_h)
    assert res.status_code == 403
    assert "Only the ticket creator or SUPER_ADMIN can close tickets" in res.json()["detail"]

    # 5. Assigned employee CANNOT reopen ticket (HTTP 403)
    res = client.put(f"/api/tickets/{ticket_id}/reopen", json={"reason": "Unauthorized attempt"}, headers=assignee_h)
    assert res.status_code == 403
    assert "Only the ticket creator or SUPER_ADMIN can reopen tickets" in res.json()["detail"]

    # 6. Unrelated employee also gets 403
    res = client.put(f"/api/tickets/{ticket_id}/close", headers=other_h)
    assert res.status_code == 403

    # 7. Creator reopens ticket from RESOLVED (HTTP 200)
    res = client.put(f"/api/tickets/{ticket_id}/reopen", json={"reason": "Server reboot failed"}, headers=creator_h)
    assert res.status_code == 200
    assert res.json()["status"] == "REOPENED"

    # 8. Resolver resumes work and resolves
    res = client.put(f"/api/tickets/{ticket_id}/status", json={"status": "IN_PROGRESS"}, headers=assignee_h)
    assert res.status_code == 200

    res = client.put(f"/api/tickets/{ticket_id}/resolve", json={"resolution_notes": "Firmware reflashed"}, headers=assignee_h)
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"

    # 9. Creator confirms and closes ticket
    res = client.put(f"/api/tickets/{ticket_id}/close", headers=creator_h)
    assert res.status_code == 200
    assert res.json()["status"] == "CLOSED"

    # 10. Admin or creator can reopen from CLOSED
    res = client.put(f"/api/tickets/{ticket_id}/reopen", json={"reason": "Client requested re-evaluation"}, headers=creator_h)
    assert res.status_code == 200
    assert res.json()["status"] == "REOPENED"


def test_faq_persistence_and_shared_upvotes(db, client):
    """Test Requirement 6: FAQ persistence, shared visibility, upvoting toggle, and view count."""
    admin = make_admin(db, employee_id="ADM-FAQ", name="FAQ Admin")
    emp1 = make_user(db, employee_id="EMP-FAQ1", name="FAQ Employee 1")
    emp2 = make_user(db, employee_id="EMP-FAQ2", name="FAQ Employee 2")

    admin_h = auth_headers(admin)
    emp1_h = auth_headers(emp1)
    emp2_h = auth_headers(emp2)

    # 1. Admin creates a new FAQ
    res = client.post(
        "/api/faqs",
        json={
            "question": "How to set up email forwarding?",
            "answer": "Go to Webmail settings -> Forwarding and enter verified destination address.",
            "is_published": True,
        },
        headers=admin_h,
    )
    assert res.status_code == 201
    faq_data = res.json()
    faq_id = faq_data["id"]
    assert faq_data["helpful_count"] == 0
    assert faq_data["views"] == 0

    # 2. Emp1 views the FAQ
    res = client.get(f"/api/faqs/{faq_id}", headers=emp1_h)
    assert res.status_code == 200
    assert res.json()["is_voted"] is False

    # 3. Emp1 increments views
    res = client.post(f"/api/faqs/{faq_id}/view", headers=emp1_h)
    assert res.status_code == 200
    assert res.json()["views"] == 1

    # 4. Emp1 upvotes FAQ
    res = client.post(f"/api/faqs/{faq_id}/upvote", headers=emp1_h)
    assert res.status_code == 200
    assert res.json()["helpful_count"] == 1
    assert res.json()["is_voted"] is True

    # 5. Emp2 fetches FAQ and sees helpful_count == 1 and is_voted == False
    res = client.get(f"/api/faqs/{faq_id}", headers=emp2_h)
    assert res.status_code == 200
    assert res.json()["helpful_count"] == 1
    assert res.json()["is_voted"] is False

    # 6. Emp2 also upvotes FAQ -> helpful_count becomes 2
    res = client.post(f"/api/faqs/{faq_id}/upvote", headers=emp2_h)
    assert res.status_code == 200
    assert res.json()["helpful_count"] == 2
    assert res.json()["is_voted"] is True

    # 7. Emp1 toggles unvote -> helpful_count becomes 1
    res = client.post(f"/api/faqs/{faq_id}/upvote", headers=emp1_h)
    assert res.status_code == 200
    assert res.json()["helpful_count"] == 1
    assert res.json()["is_voted"] is False

    # 8. Admin deletes FAQ
    res = client.delete(f"/api/faqs/{faq_id}", headers=admin_h)
    assert res.status_code == 204

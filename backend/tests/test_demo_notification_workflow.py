"""Tests for Demo Notification Workflow, Department Auto-Routing, Permissions, and Reply Functionality."""

import pytest
from app.models.user import UserRole, User
from app.models.ticket import TicketStatus, TicketPriority
from app.models.notification import Notification
from app.services import ticket_service
from app.services.email_service import MicrosoftGraphEmailProvider
from app.schemas.ticket import TicketCreate, TicketStatusUpdate
from app.schemas.ticket_comment import TicketCommentCreate
from tests.conftest import make_user, make_admin, make_department, make_category, auth_headers


def test_department_auto_routing_mapping_for_all_departments(db):
    """Verify IT -> Sourabh (dailoqa.com), HR -> Aditya (dailoqa.com), General -> Saksham (dailoqa.com)."""
    sourabh = make_user(db, employee_id="EMP_SOURABH", name="Sourabh Pal", email="sourabh.pal@dailoqa.com")
    aditya = make_user(db, employee_id="EMP_ADITYA", name="Aditya Yadav", email="aditya.yadav@dailoqa.com")
    saksham = make_user(db, employee_id="EMP_SAKSHAM", name="Saksham Gupta", email="saksham.gupta@dailoqa.com")

    jayesh = make_user(db, employee_id="EMP_JAYESH", name="Jayesh Kansal", email="jayesh.kansal@dailoqa.com")
    ashish = make_user(db, employee_id="EMP_ASHISH", name="Ashish Rai", email="ashish.rai@dailoqa.com")

    it_dept = make_department(db, name="IT Support")
    it_dept.responsible_user_id = sourabh.id

    hr_dept = make_department(db, name="Human Resources")
    hr_dept.responsible_user_id = aditya.id

    gen_dept = make_department(db, name="General")
    gen_dept.responsible_user_id = saksham.id
    db.commit()

    it_cat = make_category(db, dept_id=it_dept.id, name="IT Hardware")
    hr_cat = make_category(db, dept_id=hr_dept.id, name="HR Payroll")
    gen_cat = make_category(db, dept_id=gen_dept.id, name="General Workplace")

    # 1. Ashish creates IT ticket -> Routes to Sourabh
    t1 = ticket_service.create_ticket(
        db, TicketCreate(title="IT Issue", description="Laptop issue", category_id=it_cat.id), current_user=ashish
    )
    assert t1.assigned_to == sourabh.id
    n1 = db.query(Notification).filter(Notification.ticket_id == t1.id).first()
    assert n1.sender_email == "ashish.rai@dailoqa.com"
    assert n1.recipient_email == "sourabh.pal@dailoqa.com"
    assert n1.delivery_status == "Demo — Not Sent"

    # 2. Jayesh creates HR ticket -> Routes to Aditya
    t2 = ticket_service.create_ticket(
        db, TicketCreate(title="HR Issue", description="Salary issue", category_id=hr_cat.id), current_user=jayesh
    )
    assert t2.assigned_to == aditya.id
    n2 = db.query(Notification).filter(Notification.ticket_id == t2.id).first()
    assert n2.sender_email == "jayesh.kansal@dailoqa.com"
    assert n2.recipient_email == "aditya.yadav@dailoqa.com"
    assert n2.delivery_status == "Demo — Not Sent"

    # 3. Ashish creates General ticket -> Routes to Saksham
    t3 = ticket_service.create_ticket(
        db, TicketCreate(title="General Issue", description="Desk issue", category_id=gen_cat.id), current_user=ashish
    )
    assert t3.assigned_to == saksham.id
    n3 = db.query(Notification).filter(Notification.ticket_id == t3.id).first()
    assert n3.sender_email == "ashish.rai@dailoqa.com"
    assert n3.recipient_email == "saksham.gupta@dailoqa.com"
    assert n3.delivery_status == "Demo — Not Sent"


def test_normal_employee_cannot_assign_tickets(client, db):
    """Test that normal employees (Jayesh Kansal, Ashish Rai) cannot assign tickets (returns 403)."""
    jayesh = make_user(db, employee_id="EMP_JAYESH", name="Jayesh Kansal", email="jayesh.kansal@dailoqa.com", role=UserRole.EMPLOYEE)
    ashish = make_user(db, employee_id="EMP_ASHISH", name="Ashish Rai", email="ashish.rai@dailoqa.com", role=UserRole.EMPLOYEE)

    dept = make_department(db, name="General")
    cat = make_category(db, dept_id=dept.id, name="General Inquiry")
    ticket_in = TicketCreate(title="Test Ticket", description="Desc", category_id=cat.id, priority=TicketPriority.MEDIUM)
    tkt = ticket_service.create_ticket(db, ticket_in, current_user=jayesh)

    # Jayesh tries to assign ticket -> 403 Forbidden
    resp = client.put(
        f"/api/tickets/{tkt.id}/assign",
        json={"assigned_to_user_id": ashish.id},
        headers=auth_headers(jayesh),
    )
    assert resp.status_code == 403


def test_responsible_employee_reply_and_resolution(client, db):
    """Test that assigned employee can reply and resolve ticket, and requester sees the update."""
    sourabh = make_user(db, employee_id="EMP_SOURABH", name="Sourabh Pal", email="sourabh.pal@dailoqa.com", role=UserRole.EMPLOYEE)
    ashish = make_user(db, employee_id="EMP_ASHISH", name="Ashish Rai", email="ashish.rai@dailoqa.com", role=UserRole.EMPLOYEE)

    dept = make_department(db, name="IT Support")
    dept.responsible_user_id = sourabh.id
    db.commit()

    cat = make_category(db, dept_id=dept.id, name="Software")
    ticket_in = TicketCreate(title="Software Crash", description="App crashes on launch", category_id=cat.id, priority=TicketPriority.MEDIUM)
    tkt = ticket_service.create_ticket(db, ticket_in, current_user=ashish)

    # Sourabh adds a reply (comment)
    comment_in = TicketCommentCreate(content="Investigating the crash log now.", is_internal=False)
    comment = ticket_service.add_comment(db, tkt.id, comment_in, current_user=sourabh)
    assert comment.content == "Investigating the crash log now."

    # Verify update notification generated for requester (Ashish Rai)
    notif = db.query(Notification).filter(
        Notification.ticket_id == tkt.id,
        Notification.user_id == ashish.id
    ).first()
    assert notif is not None
    assert notif.sender_email == "sourabh.pal@dailoqa.com"
    assert notif.recipient_email == "ashish.rai@dailoqa.com"
    assert notif.delivery_status == "Demo — Not Sent"

    # Sourabh starts work (ASSIGNED -> IN_PROGRESS)
    in_progress_update = TicketStatusUpdate(status=TicketStatus.IN_PROGRESS, comment="Started working on ticket.")
    tkt_in_progress = ticket_service.update_ticket_status(db, tkt.id, in_progress_update, current_user=sourabh)
    assert tkt_in_progress.status == TicketStatus.IN_PROGRESS

    # Sourabh resolves ticket (IN_PROGRESS -> RESOLVED)
    status_update = TicketStatusUpdate(status=TicketStatus.RESOLVED, comment="Fixed by updating graphics driver.")
    updated_tkt = ticket_service.update_ticket_status(db, tkt.id, status_update, current_user=sourabh)
    assert updated_tkt.status == TicketStatus.RESOLVED

    # Requester views comments & status via API
    resp = client.get(f"/api/tickets/{tkt.id}", headers=auth_headers(ashish))
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "RESOLVED"


def test_msgraph_provider_does_not_claim_sending_without_approval():
    """Verify that Microsoft Graph provider raises explicit error without approval."""
    provider = MicrosoftGraphEmailProvider()
    with pytest.raises(NotImplementedError) as exc_info:
        provider.send_notification(
            sender_email="sourabh.pal@dailoqa.com",
            recipient_email="ashish.rai@dailoqa.com",
            subject="Test",
            body="Test",
            portal_link="/tickets/123",
        )
    assert "Microsoft 365 Administrator approval is currently unavailable" in str(exc_info.value)

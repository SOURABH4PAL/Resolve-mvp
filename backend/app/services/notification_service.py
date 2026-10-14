from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.ticket import Ticket
from app.models.user import User
from app.services.email_service import get_email_provider
from app.config import get_settings

settings = get_settings()


def create_ticket_created_notification(
    db: Session, ticket: Ticket, requester: User, assignee: User
) -> Notification:
    """Generate simulated email notification when a ticket is created and routed."""
    provider = get_email_provider()

    sender_email = requester.email
    recipient_email = assignee.email
    subject = f"[ResolveHub] New Ticket Created: {ticket.ticket_number} - {ticket.title}"
    portal_link = f"/tickets/{ticket.id}"

    body = (
        f"A new ticket has been assigned to you.\n\n"
        f"Ticket Number: {ticket.ticket_number}\n"
        f"Title: {ticket.title}\n"
        f"Requester: {requester.name} ({requester.email})\n"
        f"Priority: {ticket.priority.value if hasattr(ticket.priority, 'value') else ticket.priority}\n"
        f"Description: {ticket.description}\n\n"
        f"View Ticket in Portal: {portal_link}\n\n"
        f"Status: Demo — Not Sent (Simulated Email Record)"
    )

    result = provider.send_notification(
        sender_email=sender_email,
        recipient_email=recipient_email,
        subject=subject,
        body=body,
        portal_link=portal_link,
    )

    notif = Notification(
        user_id=assignee.id,
        sender_email=result["sender_email"],
        recipient_email=result["recipient_email"],
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=result["subject"],
        message=result["body"],
        delivery_status=result["delivery_status"],
        is_demo=result["is_demo"],
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def create_ticket_update_notification(
    db: Session, ticket: Ticket, actor: User, recipient: User, update_text: str
) -> Notification:
    """Generate simulated email notification on ticket reply or status transition."""
    provider = get_email_provider()

    sender_email = actor.email
    recipient_email = recipient.email
    subject = f"[ResolveHub] Update on Ticket {ticket.ticket_number}: {ticket.title}"
    portal_link = f"/tickets/{ticket.id}"

    status_val = ticket.status.value if hasattr(ticket.status, "value") else ticket.status

    body = (
        f"Update on ticket {ticket.ticket_number}.\n\n"
        f"Updated by: {actor.name} ({actor.email})\n"
        f"Current Status: {status_val}\n"
        f"Details: {update_text}\n\n"
        f"View Ticket in Portal: {portal_link}\n\n"
        f"Status: Demo — Not Sent (Simulated Email Record)"
    )

    result = provider.send_notification(
        sender_email=sender_email,
        recipient_email=recipient_email,
        subject=subject,
        body=body,
        portal_link=portal_link,
    )

    notif = Notification(
        user_id=recipient.id,
        sender_email=result["sender_email"],
        recipient_email=result["recipient_email"],
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=result["subject"],
        message=result["body"],
        delivery_status=result["delivery_status"],
        is_demo=result["is_demo"],
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

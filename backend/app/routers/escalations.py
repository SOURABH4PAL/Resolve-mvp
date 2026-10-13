from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.ticket import Ticket
from app.models.ticket_comment import TicketComment
from app.models.ticket_escalation import TicketEscalation, EscalationStatus
from app.models.notification import Notification
from app.schemas.ticket_escalation import TicketEscalationCreate, TicketEscalationRead
from app.dependencies import get_current_user

router = APIRouter(tags=["Escalations"])


@router.post("/tickets/{ticket_id}/escalate", response_model=TicketEscalationRead, status_code=status.HTTP_201_CREATED)
def escalate_ticket(
    ticket_id: str,
    esc_in: TicketEscalationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Raise an escalation on a ticket. Only ticket creator, assigned employee, or admin can escalate."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    is_creator = ticket.created_by == current_user.id
    is_assignee = ticket.assigned_to == current_user.id
    is_admin = current_user.role == UserRole.SUPER_ADMIN

    if not (is_creator or is_assignee or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only the ticket creator, assigned staff, or administrator can escalate this ticket."
        )

    escalation = TicketEscalation(
        ticket_id=ticket.id,
        escalation_type=esc_in.escalation_type or "USER_HIGHLIGHT",
        raised_by=current_user.id,
        reason=esc_in.reason,
        status=EscalationStatus.OPEN,
    )
    db.add(escalation)

    # Add audit comment
    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        content=f"[ESCALATION RAISED - {escalation.escalation_type}] {esc_in.reason}",
        is_internal=False,
    )
    db.add(comment)

    # Notify admins and assignee if different from current user
    recipients = set()
    admins = db.query(User).filter(User.role == UserRole.SUPER_ADMIN, User.is_active == True).all()
    for a in admins:
        if a.id != current_user.id:
            recipients.add(a.id)
    if ticket.assigned_to and ticket.assigned_to != current_user.id:
        recipients.add(ticket.assigned_to)

    for r_id in recipients:
        r_user = db.query(User).filter(User.id == r_id).first()
        db.add(Notification(
            user_id=r_id,
            recipient_email=r_user.email if r_user else "user@resolvehub.com",
            sender_email="system@resolvehub.com",
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number,
            title=f"Ticket Escalated: {ticket.ticket_number}",
            message=f"Escalation raised by {current_user.name}: {esc_in.reason[:100]}",
        ))

    db.commit()
    db.refresh(escalation)
    return escalation


@router.get("/escalations", response_model=List[TicketEscalationRead])
def list_escalations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List escalations. Admin sees all; employees see escalations on their tickets."""
    query = db.query(TicketEscalation)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.join(Ticket, TicketEscalation.ticket_id == Ticket.id).filter(
            (Ticket.created_by == current_user.id) | (Ticket.assigned_to == current_user.id)
        )
    return query.order_by(TicketEscalation.created_at.desc()).all()


@router.get("/tickets/{ticket_id}/escalations", response_model=List[TicketEscalationRead])
def get_ticket_escalations(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List escalations for a specific ticket."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    is_creator = ticket.created_by == current_user.id
    is_assignee = ticket.assigned_to == current_user.id
    is_admin = current_user.role == UserRole.SUPER_ADMIN
    if not (is_creator or is_assignee or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return (
        db.query(TicketEscalation)
        .filter(TicketEscalation.ticket_id == ticket.id)
        .order_by(TicketEscalation.created_at.desc())
        .all()
    )

import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile

from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.ticket_comment import TicketComment
from app.models.ticket_attachment import TicketAttachment
from app.schemas.ticket import TicketCreate, TicketStatusUpdate, TicketResolve
from app.schemas.ticket_comment import TicketCommentCreate
from app.utils.ticket_number import generate_ticket_number
from app.config import get_settings

settings = get_settings()


def create_ticket(db: Session, ticket_in: TicketCreate, current_user: User) -> Ticket:
    """Create a new ticket with unique ticket number."""
    ticket_num = generate_ticket_number(db)
    
    ticket = Ticket(
        ticket_number=ticket_num,
        title=ticket_in.title,
        description=ticket_in.description,
        created_by=current_user.id,
        category_id=ticket_in.category_id,
        subcategory_id=ticket_in.subcategory_id,
        priority=ticket_in.priority,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def get_user_tickets(db: Session, current_user: User) -> List[Ticket]:
    """Retrieve tickets accessible to the user:
    - EMPLOYEE: tickets created by self or assigned to self
    - SUPER_ADMIN: all tickets
    """
    if current_user.role == UserRole.SUPER_ADMIN:
        return db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    return db.query(Ticket).filter(
        (Ticket.created_by == current_user.id) | 
        (Ticket.assigned_to == current_user.id)
    ).order_by(Ticket.created_at.desc()).all()


def get_ticket_by_id(db: Session, ticket_id: str, current_user: User) -> Ticket:
    """Fetch ticket details ensuring ownership, assigned employee, or admin access."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    # Authorization check
    if (
        current_user.role != UserRole.SUPER_ADMIN and 
        ticket.created_by != current_user.id and 
        ticket.assigned_to != current_user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this ticket")

    return ticket


def update_ticket_status(db: Session, ticket_id: str, update_in: TicketStatusUpdate, current_user: User) -> Ticket:
    """Update status of a ticket."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)
    
    if current_user.role != UserRole.SUPER_ADMIN:
        is_assigned = (ticket.assigned_to == current_user.id)
        if not is_assigned and update_in.status not in [TicketStatus.CLOSED, TicketStatus.REOPENED]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees can only close or reopen their tickets unless assigned to them"
            )

    ticket.status = update_in.status
    if update_in.status == TicketStatus.RESOLVED:
        ticket.resolved_at = datetime.utcnow()
    elif update_in.status == TicketStatus.CLOSED:
        ticket.closed_at = datetime.utcnow()

    # If a comment is provided during status update, record it
    if update_in.comment and update_in.comment.strip():
        comment = TicketComment(
            ticket_id=ticket.id,
            user_id=current_user.id,
            content=f"Status updated to {update_in.status.value}: {update_in.comment.strip()}",
            is_internal=False
        )
        db.add(comment)

    db.commit()
    db.refresh(ticket)
    return ticket


def resolve_ticket(db: Session, ticket_id: str, resolve_in: TicketResolve, current_user: User) -> Ticket:
    """Mark ticket as RESOLVED."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)
    
    if current_user.role != UserRole.SUPER_ADMIN and ticket.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned employee or admin can resolve this ticket"
        )

    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_at = datetime.utcnow()

    resolution_text = resolve_in.resolution_notes or "Ticket has been marked as resolved."
    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        content=f"Resolution: {resolution_text}",
        is_internal=False
    )
    db.add(comment)

    db.commit()
    db.refresh(ticket)
    return ticket


def close_ticket(db: Session, ticket_id: str, current_user: User) -> Ticket:
    """Mark ticket as CLOSED."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)
    
    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = datetime.utcnow()

    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        content="Ticket closed.",
        is_internal=False
    )
    db.add(comment)

    db.commit()
    db.refresh(ticket)
    return ticket


def add_comment(db: Session, ticket_id: str, comment_in: TicketCommentCreate, current_user: User) -> TicketComment:
    """Add a comment or internal note to a ticket."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    if comment_in.is_internal and current_user.role != UserRole.SUPER_ADMIN and ticket.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned employees or admins can create internal notes"
        )

    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        content=comment_in.content,
        is_internal=comment_in.is_internal
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def get_ticket_comments(db: Session, ticket_id: str, current_user: User) -> List[TicketComment]:
    """Retrieve comments for a ticket. Hide internal notes for non-assigned employees."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    query = db.query(TicketComment).filter(TicketComment.ticket_id == ticket.id)
    if current_user.role != UserRole.SUPER_ADMIN and ticket.assigned_to != current_user.id:
        query = query.filter(TicketComment.is_internal == False)

    return query.order_by(TicketComment.created_at.asc()).all()


async def add_attachment(db: Session, ticket_id: str, file: UploadFile, current_user: User) -> TicketAttachment:
    """Save file upload locally and record attachment metadata."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{ticket.id}_{int(datetime.utcnow().timestamp())}{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    contents = await file.read()
    file_size = len(contents)

    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    attachment = TicketAttachment(
        ticket_id=ticket.id,
        uploaded_by=current_user.id,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def get_ticket_attachments(db: Session, ticket_id: str, current_user: User) -> List[TicketAttachment]:
    """List attachments for a ticket."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)
    return db.query(TicketAttachment).filter(TicketAttachment.ticket_id == ticket.id).order_by(TicketAttachment.created_at.asc()).all()

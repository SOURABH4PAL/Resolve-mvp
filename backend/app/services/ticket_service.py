import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile

from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.ticket_comment import TicketComment
from app.models.ticket_attachment import TicketAttachment
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.schemas.ticket import TicketCreate, TicketStatusUpdate, TicketResolve, TicketAssign
from app.schemas.ticket_comment import TicketCommentCreate
from app.utils.ticket_number import generate_ticket_number
from app.config import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Valid lifecycle transitions
# Each key is the CURRENT status; value is the set of ALLOWED next statuses.
# ---------------------------------------------------------------------------
VALID_TRANSITIONS: dict[TicketStatus, set[TicketStatus]] = {
    TicketStatus.OPEN: {TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.CLOSED},
    TicketStatus.ASSIGNED: {TicketStatus.IN_PROGRESS, TicketStatus.CLOSED},
    TicketStatus.IN_PROGRESS: {TicketStatus.WAITING_FOR_USER, TicketStatus.RESOLVED, TicketStatus.CLOSED},
    TicketStatus.WAITING_FOR_USER: {TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED},
    TicketStatus.RESOLVED: {TicketStatus.CLOSED, TicketStatus.IN_PROGRESS, TicketStatus.REOPENED},
    TicketStatus.REOPENED: {TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_USER, TicketStatus.RESOLVED, TicketStatus.CLOSED},
    TicketStatus.CLOSED: set(),   # terminal — no further transitions
}


def _assert_transition_allowed(current: TicketStatus, target: TicketStatus) -> None:
    """Raise 422 if the requested status transition is not in the allowed set."""
    allowed = VALID_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Cannot transition ticket from '{current.value}' to '{target.value}'. "
                f"Allowed next statuses: {[s.value for s in allowed] or ['none (terminal state)']}"
            ),
        )


def _add_system_comment(db: Session, ticket_id: str, actor_id: str, content: str) -> None:
    """Insert an auto-generated (system) comment on a ticket."""
    comment = TicketComment(
        ticket_id=ticket_id,
        user_id=actor_id,
        content=content,
        is_internal=False,
    )
    db.add(comment)


# ---------------------------------------------------------------------------
# Ticket CRUD
# ---------------------------------------------------------------------------

def create_ticket(db: Session, ticket_in: TicketCreate, current_user: User) -> Ticket:
    """Create a new ticket with validation of category/subcategory."""
    # Validate category exists
    category = db.query(Category).filter(Category.id == ticket_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Category '{ticket_in.category_id}' does not exist",
        )

    # Validate subcategory belongs to the given category (if provided)
    if ticket_in.subcategory_id:
        subcategory = db.query(Subcategory).filter(
            Subcategory.id == ticket_in.subcategory_id
        ).first()
        if not subcategory:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Subcategory '{ticket_in.subcategory_id}' does not exist",
            )
        if subcategory.category_id != ticket_in.category_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Subcategory does not belong to the specified category",
            )

    ticket_num = generate_ticket_number(db)

    ticket = Ticket(
        ticket_number=ticket_num,
        title=ticket_in.title,
        description=ticket_in.description,
        created_by=current_user.id,
        category_id=ticket_in.category_id,
        subcategory_id=ticket_in.subcategory_id,
        priority=ticket_in.priority,
        status=TicketStatus.OPEN,
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
    return (
        db.query(Ticket)
        .filter(
            (Ticket.created_by == current_user.id)
            | (Ticket.assigned_to == current_user.id)
        )
        .order_by(Ticket.created_at.desc())
        .all()
    )


def get_ticket_by_id(db: Session, ticket_id: str, current_user: User) -> Ticket:
    """Fetch ticket details ensuring ownership, assigned employee, or admin access."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    # Authorization check
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and ticket.created_by != current_user.id
        and ticket.assigned_to != current_user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this ticket")

    return ticket


# ---------------------------------------------------------------------------
# Assign ticket (SUPER_ADMIN only)
# ---------------------------------------------------------------------------

def assign_ticket(db: Session, ticket_id: str, assign_in: TicketAssign, current_user: User) -> Ticket:
    """Assign a ticket to an active employee. SUPER_ADMIN only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SUPER_ADMIN can assign tickets",
        )

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    try:
        target_id = assign_in.target_assignee_id
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # Validate assignee exists, is active, and is an employee
    assignee = db.query(User).filter(
        (User.id == target_id) | (User.employee_id == target_id),
        User.is_active == True,
    ).first()
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assignee not found or is not active",
        )
    if assignee.role != UserRole.EMPLOYEE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tickets can only be assigned to employees",
        )

    ticket.assigned_to = assignee.id

    # Auto-advance status to ASSIGNED if currently OPEN
    if ticket.status == TicketStatus.OPEN:
        ticket.status = TicketStatus.ASSIGNED

    _add_system_comment(
        db,
        ticket.id,
        current_user.id,
        f"Ticket assigned to {assignee.name} ({assignee.employee_id}) by {current_user.name}.",
    )

    db.commit()
    db.refresh(ticket)
    return ticket


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------

def update_ticket_status(
    db: Session, ticket_id: str, update_in: TicketStatusUpdate, current_user: User
) -> Ticket:
    """Update status of a ticket with lifecycle validation and permission checks."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    new_status = update_in.status

    # --- permission check per target status ---
    is_admin = current_user.role == UserRole.SUPER_ADMIN
    is_assigned = ticket.assigned_to == current_user.id
    is_creator = ticket.created_by == current_user.id

    if new_status in {TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_USER, TicketStatus.ASSIGNED}:
        if new_status == TicketStatus.IN_PROGRESS and ticket.status in {TicketStatus.RESOLVED, TicketStatus.REOPENED}:
            if not is_admin and not is_creator and not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the ticket creator, assigned employee, or SUPER_ADMIN can reopen a resolved ticket",
                )
        else:
            if not is_admin and not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the assigned employee or SUPER_ADMIN can change work-related statuses",
                )
    elif new_status == TicketStatus.REOPENED:
        if not is_admin and not is_creator:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the ticket creator or SUPER_ADMIN can reopen tickets",
            )
    elif new_status == TicketStatus.RESOLVED:
        if not is_admin and not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned employee or SUPER_ADMIN can resolve tickets",
            )
    elif new_status == TicketStatus.CLOSED:
        # Admin can close any ticket; creator can only close after RESOLVED
        if not is_admin:
            if not is_creator:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the ticket creator or SUPER_ADMIN can close tickets",
                )
            if ticket.status != TicketStatus.RESOLVED:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="You can only close a ticket that is in RESOLVED status",
                )

    # --- lifecycle validation ---
    _assert_transition_allowed(ticket.status, new_status)

    ticket.status = new_status
    if new_status == TicketStatus.RESOLVED:
        ticket.resolved_at = datetime.utcnow()
    elif new_status == TicketStatus.CLOSED:
        ticket.closed_at = datetime.utcnow()

    # Optional human comment
    if update_in.comment and update_in.comment.strip():
        _add_system_comment(
            db,
            ticket.id,
            current_user.id,
            f"Status updated to {new_status.value}: {update_in.comment.strip()}",
        )

    db.commit()
    db.refresh(ticket)
    return ticket


def resolve_ticket(db: Session, ticket_id: str, resolve_in: TicketResolve, current_user: User) -> Ticket:
    """Mark ticket as RESOLVED — convenience endpoint around update_ticket_status."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    is_admin = current_user.role == UserRole.SUPER_ADMIN
    is_assigned = ticket.assigned_to == current_user.id

    if not is_admin and not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned employee or SUPER_ADMIN can resolve this ticket",
        )

    _assert_transition_allowed(ticket.status, TicketStatus.RESOLVED)

    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_at = datetime.utcnow()

    resolution_text = resolve_in.resolution_notes or "Ticket has been marked as resolved."
    _add_system_comment(db, ticket.id, current_user.id, f"Resolution: {resolution_text}")

    db.commit()
    db.refresh(ticket)
    return ticket


def close_ticket(db: Session, ticket_id: str, current_user: User) -> Ticket:
    """Mark ticket as CLOSED."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    is_admin = current_user.role == UserRole.SUPER_ADMIN
    is_creator = ticket.created_by == current_user.id

    if not is_admin and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the ticket creator or SUPER_ADMIN can close tickets",
        )

    if not is_admin and ticket.status != TicketStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="You can only close a ticket that is in RESOLVED status",
        )

    _assert_transition_allowed(ticket.status, TicketStatus.CLOSED)

    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = datetime.utcnow()

    _add_system_comment(db, ticket.id, current_user.id, "Ticket closed.")

    db.commit()
    db.refresh(ticket)
    return ticket


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def add_comment(
    db: Session, ticket_id: str, comment_in: TicketCommentCreate, current_user: User
) -> TicketComment:
    """Add a comment or internal note to a ticket."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    if (
        comment_in.is_internal
        and current_user.role != UserRole.SUPER_ADMIN
        and ticket.assigned_to != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned employees or admins can create internal notes",
        )

    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        content=comment_in.content,
        is_internal=comment_in.is_internal,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def get_ticket_comments(
    db: Session, ticket_id: str, current_user: User
) -> List[TicketComment]:
    """Retrieve comments for a ticket. Hide internal notes for non-assigned employees."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    query = db.query(TicketComment).filter(TicketComment.ticket_id == ticket.id)
    if current_user.role != UserRole.SUPER_ADMIN and ticket.assigned_to != current_user.id:
        query = query.filter(TicketComment.is_internal == False)  # noqa: E712

    return query.order_by(TicketComment.created_at.asc()).all()


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

async def add_attachment(
    db: Session, ticket_id: str, file: UploadFile, current_user: User
) -> TicketAttachment:
    """Save file upload to an absolute path and record attachment metadata."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    # Always resolve to absolute path for safety
    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename or "")[1]
    safe_filename = f"{ticket.id}_{int(datetime.utcnow().timestamp())}{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    contents = await file.read()
    file_size = len(contents)

    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    attachment = TicketAttachment(
        ticket_id=ticket.id,
        uploaded_by=current_user.id,
        file_name=file.filename,
        file_path=file_path,   # stored internally; never exposed in API response
        file_size=file_size,
        mime_type=file.content_type,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def get_ticket_attachments(
    db: Session, ticket_id: str, current_user: User
) -> List[TicketAttachment]:
    """List attachments for a ticket."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)
    return (
        db.query(TicketAttachment)
        .filter(TicketAttachment.ticket_id == ticket.id)
        .order_by(TicketAttachment.created_at.asc())
        .all()
    )

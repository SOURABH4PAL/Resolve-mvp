import math
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile

from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.ticket_comment import TicketComment
from app.models.ticket_attachment import TicketAttachment
from app.models.notification import Notification
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.models.department import Department
from app.models.routing_rule import RoutingRule
from app.schemas.ticket import TicketCreate, TicketStatusUpdate, TicketResolve, TicketAssign
from app.schemas.ticket_comment import TicketCommentCreate
from app.utils.ticket_number import generate_ticket_number
from app.config import get_settings
from app.services import notification_service

settings = get_settings()

SLA_TARGETS = {
    TicketPriority.CRITICAL: {"response_hours": 1, "resolution_hours": 4},
    TicketPriority.HIGH: {"response_hours": 2, "resolution_hours": 8},
    TicketPriority.MEDIUM: {"response_hours": 4, "resolution_hours": 24},
    TicketPriority.LOW: {"response_hours": 8, "resolution_hours": 48},
}


def _send_notification(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    ticket_id: Optional[str] = None,
) -> None:
    """Create an in-app notification for a user."""
    notif = Notification(
        user_id=user_id,
        ticket_id=ticket_id,
        title=title,
        message=message,
        is_read=False,
    )
    db.add(notif)

TICKET_SORT_FIELDS = {
    "created_at": Ticket.created_at,
    "updated_at": Ticket.updated_at,
    "priority": Ticket.priority,
    "status": Ticket.status,
    "title": Ticket.title,
    "ticket_number": Ticket.ticket_number,
}

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
    TicketStatus.CLOSED: {TicketStatus.REOPENED},
    TicketStatus.REOPENED: {TicketStatus.IN_PROGRESS, TicketStatus.ASSIGNED, TicketStatus.RESOLVED, TicketStatus.CLOSED},
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

    # Auto-routing precedence: subcategory rule -> category rule -> department lead
    department = db.query(Department).filter(Department.id == category.department_id).first()
    assigned_to_id = None
    initial_status = TicketStatus.OPEN
    assignee = None

    if ticket_in.subcategory_id:
        sub_rule = db.query(RoutingRule).filter(
            RoutingRule.subcategory_id == ticket_in.subcategory_id,
            RoutingRule.is_active == True,
            RoutingRule.assigned_user_id.isnot(None),
        ).first()
        if sub_rule and sub_rule.assigned_user_id:
            assignee = db.query(User).filter(User.id == sub_rule.assigned_user_id, User.is_active == True).first()

    if not assignee:
        cat_rule = db.query(RoutingRule).filter(
            RoutingRule.category_id == ticket_in.category_id,
            (RoutingRule.subcategory_id.is_(None)) | (RoutingRule.subcategory_id == ""),
            RoutingRule.is_active == True,
            RoutingRule.assigned_user_id.isnot(None),
        ).first()
        if cat_rule and cat_rule.assigned_user_id:
            assignee = db.query(User).filter(User.id == cat_rule.assigned_user_id, User.is_active == True).first()

    if not assignee and department and department.responsible_user_id:
        assignee = db.query(User).filter(
            User.id == department.responsible_user_id,
            User.is_active == True
        ).first()

    if assignee:
        assigned_to_id = assignee.id
        initial_status = TicketStatus.ASSIGNED

    now = datetime.utcnow()
    prio = ticket_in.priority if ticket_in.priority else TicketPriority.MEDIUM
    sla = SLA_TARGETS.get(prio, SLA_TARGETS[TicketPriority.MEDIUM])
    resp_due = now + timedelta(hours=sla["response_hours"])
    res_due = now + timedelta(hours=sla["resolution_hours"])

    ticket = Ticket(
        ticket_number=ticket_num,
        title=ticket_in.title,
        description=ticket_in.description,
        created_by=current_user.id,
        category_id=ticket_in.category_id,
        subcategory_id=ticket_in.subcategory_id,
        assigned_to=assigned_to_id,
        priority=prio,
        status=initial_status,
        response_due_at=resp_due,
        resolution_due_at=res_due,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    if assignee:
        _add_system_comment(
            db,
            ticket.id,
            current_user.id,
            f"Ticket automatically routed to {assignee.name} ({department.name} lead).",
        )
        db.commit()
        # Generate simulated email notification for assignee
        try:
            notification_service.create_ticket_created_notification(
                db, ticket, requester=current_user, assignee=assignee
            )
        except Exception:
            pass
        _send_notification(
            db,
            user_id=assignee.id,
            title=f"Ticket Assigned: {ticket.ticket_number}",
            message=f"You have been assigned ticket '{ticket.title}'.",
            ticket_id=ticket.id,
        )

    # In-app notification to all active super admins
    admins = db.query(User).filter(User.role == UserRole.SUPER_ADMIN, User.is_active == True).all()
    for admin in admins:
        _send_notification(
            db,
            user_id=admin.id,
            title=f"New Ticket Created: {ticket.ticket_number}",
            message=f"Ticket '{ticket.title}' was created by {current_user.name}.",
            ticket_id=ticket.id,
        )
    db.commit()
    return ticket


def get_user_tickets(
    db: Session,
    current_user: User,
    search: Optional[str] = None,
    priority: Optional[TicketPriority] = None,
    status_filter: Optional[TicketStatus] = None,
    department_id: Optional[str] = None,
    category_id: Optional[str] = None,
    subcategory_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    created_by: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Tuple[List[Ticket], int, int, int]:
    """Retrieve tickets accessible to the user, with search, filtering, sorting, and pagination:
    - EMPLOYEE: tickets created by self or assigned to self
    - SUPER_ADMIN: all tickets
    Returns: (items, total_count, current_page, total_pages)
    """
    query = db.query(Ticket)

    # Permission check: EMPLOYEE only sees own or assigned tickets
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(
            (Ticket.created_by == current_user.id)
            | (Ticket.assigned_to == current_user.id)
        )

    # Search filter (title, ticket_number, description)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Ticket.ticket_number.ilike(search_term))
            | (Ticket.title.ilike(search_term))
            | (Ticket.description.ilike(search_term))
        )

    # Filtering
    if priority:
        query = query.filter(Ticket.priority == priority)
    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if category_id:
        query = query.filter(Ticket.category_id == category_id)
    if subcategory_id:
        query = query.filter(Ticket.subcategory_id == subcategory_id)
    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)
    if created_by:
        query = query.filter(Ticket.created_by == created_by)
    if department_id:
        query = query.join(Ticket.category).filter(Category.department_id == department_id)

    # Count total matching records before pagination
    total = query.count()

    # Sorting with allowlist validation
    if sort_by:
        normalized_sort = sort_by.strip().lower()
        if normalized_sort not in TICKET_SORT_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort field '{sort_by}'. Allowed fields: {sorted(list(TICKET_SORT_FIELDS.keys()))}",
            )
        col = TICKET_SORT_FIELDS[normalized_sort]
        norm_order = (sort_order or "desc").strip().lower()
        if norm_order not in ("asc", "desc"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort order '{sort_order}'. Allowed values: ['asc', 'desc']",
            )
        if norm_order == "asc":
            query = query.order_by(col.asc())
        else:
            query = query.order_by(col.desc())
    else:
        query = query.order_by(Ticket.created_at.desc())

    # Pagination
    if page is not None:
        effective_page_size = page_size if page_size is not None else 10
        total_pages = math.ceil(total / effective_page_size) if total > 0 else 0
        offset = (page - 1) * effective_page_size
        items = query.offset(offset).limit(effective_page_size).all()
        return items, total, page, total_pages

    # If page is not specified, return all items
    items = query.all()
    effective_page_size = len(items) if items else 10
    total_pages = 1 if total > 0 else 0
    return items, total, 1, total_pages


def get_ticket_by_id(db: Session, ticket_id: str, current_user: User) -> Ticket:
    """Fetch ticket details ensuring ownership, assigned employee, or admin access.
    
    Supports lookup by both UUID (id) and human-readable ticket_number (e.g. TKT-000101).
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        # Fallback: try matching by ticket_number (e.g. TKT-000101)
        ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
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

    # Validate assignee exists and is active
    target_id = assign_in.assignee_id or assign_in.assigned_to_user_id or assign_in.assigned_to
    if not target_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assignee ID is required",
        )

    assignee = db.query(User).filter(
        User.id == target_id,
        User.is_active == True,
    ).first()
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assignee not found or is not active",
        )
    if assignee.role not in {UserRole.EMPLOYEE, UserRole.RESOLVER}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tickets can only be assigned to employees or resolvers",
        )

    ticket.assigned_to = assignee.id

    # Auto-advance status to ASSIGNED if currently OPEN
    if ticket.status == TicketStatus.OPEN:
        ticket.status = TicketStatus.ASSIGNED

    if ticket.first_responded_at is None:
        ticket.first_responded_at = datetime.utcnow()

    _add_system_comment(
        db,
        ticket.id,
        current_user.id,
        f"Ticket assigned to {assignee.name} ({assignee.employee_id}) by {current_user.name}.",
    )

    _send_notification(
        db,
        user_id=assignee.id,
        title=f"Ticket Assigned: {ticket.ticket_number}",
        message=f"You have been assigned ticket '{ticket.title}' by {current_user.name}.",
        ticket_id=ticket.id,
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

    # Statuses that require admin OR assigned employee
    work_statuses = {TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_USER, TicketStatus.ASSIGNED}

    if new_status in work_statuses:
        if not is_admin and not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned employee or SUPER_ADMIN can change work-related statuses",
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
    elif new_status == TicketStatus.REOPENED:
        if not is_admin and not is_creator:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the ticket creator or SUPER_ADMIN can reopen tickets",
            )
        if ticket.status not in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="You can only reopen a ticket that is in RESOLVED or CLOSED status",
            )

    # --- lifecycle validation ---
    _assert_transition_allowed(ticket.status, new_status)

    if ticket.first_responded_at is None and current_user.id != ticket.created_by:
        ticket.first_responded_at = datetime.utcnow()

    ticket.status = new_status
    if new_status == TicketStatus.RESOLVED:
        ticket.resolved_at = datetime.utcnow()
        if ticket.created_by != current_user.id:
            _send_notification(
                db,
                user_id=ticket.created_by,
                title=f"Ticket Resolved: {ticket.ticket_number}",
                message=f"Your ticket '{ticket.title}' has been marked as RESOLVED by {current_user.name}.",
                ticket_id=ticket.id,
            )
    elif new_status == TicketStatus.CLOSED:
        ticket.closed_at = datetime.utcnow()
        if ticket.created_by != current_user.id:
            _send_notification(
                db,
                user_id=ticket.created_by,
                title=f"Ticket Closed: {ticket.ticket_number}",
                message=f"Your ticket '{ticket.title}' has been marked as CLOSED.",
                ticket_id=ticket.id,
            )
    elif new_status == TicketStatus.REOPENED:
        ticket.closed_at = None
        ticket.resolved_at = None
        if ticket.assigned_to and ticket.assigned_to != current_user.id:
            _send_notification(
                db,
                user_id=ticket.assigned_to,
                title=f"Ticket Reopened: {ticket.ticket_number}",
                message=f"Ticket '{ticket.title}' has been reopened by {current_user.name}.",
                ticket_id=ticket.id,
            )

    # Optional human comment
    if update_in.comment and update_in.comment.strip():
        _add_system_comment(
            db,
            ticket.id,
            current_user.id,
            f"Status updated to {new_status.value}: {update_in.comment.strip()}",
        )

    db.commit()
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

    if ticket.first_responded_at is None and current_user.id != ticket.created_by:
        ticket.first_responded_at = datetime.utcnow()

    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_at = datetime.utcnow()

    resolution_text = resolve_in.resolution_notes or "Ticket has been marked as resolved."
    _add_system_comment(db, ticket.id, current_user.id, f"Resolution: {resolution_text}")

    if ticket.created_by != current_user.id:
        _send_notification(
            db,
            user_id=ticket.created_by,
            title=f"Ticket Resolved: {ticket.ticket_number}",
            message=f"Your ticket '{ticket.title}' has been resolved by {current_user.name}.",
            ticket_id=ticket.id,
        )

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

    if ticket.created_by != current_user.id:
        _send_notification(
            db,
            user_id=ticket.created_by,
            title=f"Ticket Closed: {ticket.ticket_number}",
            message=f"Your ticket '{ticket.title}' has been closed.",
            ticket_id=ticket.id,
        )

    db.commit()
    db.refresh(ticket)
    return ticket


def reopen_ticket(
    db: Session, ticket_id: str, current_user: User, reason: Optional[str] = None
) -> Ticket:
    """Mark ticket as REOPENED. Creator or SUPER_ADMIN only."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    is_admin = current_user.role == UserRole.SUPER_ADMIN
    is_creator = ticket.created_by == current_user.id

    if not is_admin and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the ticket creator or SUPER_ADMIN can reopen tickets",
        )

    if ticket.status not in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="You can only reopen a ticket that is in RESOLVED or CLOSED status",
        )

    _assert_transition_allowed(ticket.status, TicketStatus.REOPENED)

    ticket.status = TicketStatus.REOPENED
    ticket.closed_at = None
    ticket.resolved_at = None

    comment_msg = f"Ticket reopened: {reason.strip()}" if reason and reason.strip() else "Ticket reopened by employee."
    _add_system_comment(db, ticket.id, current_user.id, comment_msg)

    if ticket.assigned_to and ticket.assigned_to != current_user.id:
        _send_notification(
            db,
            user_id=ticket.assigned_to,
            title=f"Ticket Reopened: {ticket.ticket_number}",
            message=f"Ticket '{ticket.title}' has been reopened by {current_user.name}.",
            ticket_id=ticket.id,
        )

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

    if ticket.first_responded_at is None and current_user.id != ticket.created_by:
        ticket.first_responded_at = datetime.utcnow()

    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        content=comment_in.content,
        is_internal=comment_in.is_internal,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Notify recipient if public comment
    if not comment_in.is_internal:
        try:
            recipient_id = None
            if current_user.id == ticket.assigned_to and ticket.created_by != current_user.id:
                recipient_id = ticket.created_by
            elif current_user.id == ticket.created_by and ticket.assigned_to:
                recipient_id = ticket.assigned_to

            if recipient_id:
                recipient = db.query(User).filter(User.id == recipient_id).first()
                if recipient:
                    notification_service.create_ticket_update_notification(
                        db, ticket, actor=current_user, recipient=recipient, update_text=f"Reply: {comment_in.content}"
                    )
        except Exception:
            pass

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


def delete_comment(
    db: Session, ticket_id: str, comment_id: str, current_user: User
) -> None:
    """Delete a comment (SUPER_ADMIN or author only)."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    comment = db.query(TicketComment).filter(
        TicketComment.id == comment_id,
        TicketComment.ticket_id == ticket.id,
    ).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    is_admin = current_user.role == UserRole.SUPER_ADMIN
    is_author = comment.user_id == current_user.id
    if not is_admin and not is_author:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only comment author or SUPER_ADMIN can delete this comment",
        )

    db.delete(comment)
    db.commit()


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

def _validate_attachment_file(file: UploadFile, contents: bytes) -> tuple[str, int]:
    """Validate file name, extension, and content size according to settings."""
    if not file.filename or not file.filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed = [ext.lower() for ext in settings.ALLOWED_EXTENSIONS]
    if file_ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type '{file_ext}'. "
                f"Supported types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            ),
        )

    file_size = len(contents)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload an empty file",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    return file_ext, file_size


async def add_attachment(
    db: Session, ticket_id: str, file: UploadFile, current_user: User
) -> TicketAttachment:
    """Save file upload to an absolute path and record attachment metadata."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    contents = await file.read()
    file_ext, file_size = _validate_attachment_file(file, contents)

    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)

    safe_filename = f"{ticket.id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)

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


async def add_multiple_attachments(
    db: Session, ticket_id: str, files: List[UploadFile], current_user: User
) -> List[TicketAttachment]:
    """Validate and upload multiple files to a ticket in a single operation."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file must be provided for upload",
        )

    # Pre-read and validate all files before writing to disk
    validated: List[tuple[UploadFile, bytes, str, int]] = []
    for f in files:
        contents = await f.read()
        file_ext, file_size = _validate_attachment_file(f, contents)
        validated.append((f, contents, file_ext, file_size))

    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)

    created_attachments: List[TicketAttachment] = []
    for f, contents, file_ext, file_size in validated:
        safe_filename = f"{ticket.id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}{file_ext}"
        file_path = os.path.join(upload_dir, safe_filename)

        with open(file_path, "wb") as out:
            out.write(contents)

        attachment = TicketAttachment(
            ticket_id=ticket.id,
            uploaded_by=current_user.id,
            file_name=f.filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=f.content_type,
        )
        db.add(attachment)
        created_attachments.append(attachment)

    db.commit()
    for att in created_attachments:
        db.refresh(att)

    return created_attachments


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

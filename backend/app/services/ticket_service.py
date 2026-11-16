import math
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import case, or_
from fastapi import HTTPException, status, UploadFile

from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.ticket_comment import TicketComment
from app.models.ticket_attachment import TicketAttachment
from app.models.ticket_journey import TicketJourney
from app.models.notification import Notification
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.schemas.ticket import (
    TicketCreate,
    TicketStatusUpdate,
    TicketResolve,
    TicketAssign,
    TicketBlock,
    TicketUnblock,
)
from app.schemas.ticket_comment import TicketCommentCreate
from app.utils.ticket_number import generate_ticket_number
from app.config import get_settings

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


def _log_journey_event(
    db: Session,
    ticket_id: str,
    event_type: str,
    description: str,
    actor_id: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
) -> TicketJourney:
    """Persist an immutable audit record to the ticket journey."""
    event = TicketJourney(
        ticket_id=ticket_id,
        actor_id=actor_id,
        event_type=event_type,
        description=description,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
    )
    db.add(event)
    return event


TICKET_SORT_FIELDS = {
    "created_at": Ticket.created_at,
    "updated_at": Ticket.updated_at,
    "priority": Ticket.priority,
    "status": Ticket.status,
    "title": Ticket.title,
    "ticket_number": Ticket.ticket_number,
    "unassigned_first": None,  # handled dynamically
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
    TicketStatus.RESOLVED: {TicketStatus.CLOSED, TicketStatus.IN_PROGRESS},   # admin can reopen to IN_PROGRESS; creator closes
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
    """Create a new ticket with optional category/subcategory ('Any' preference support)."""
    clean_cat_id = ticket_in.category_id
    if clean_cat_id and clean_cat_id.strip().upper() in ("ANY", "NOT_SPECIFIED", "NONE", "ALL"):
        clean_cat_id = None

    clean_subcat_id = ticket_in.subcategory_id
    if clean_subcat_id and clean_subcat_id.strip().upper() in ("ANY", "NOT_SPECIFIED", "NONE", "ALL"):
        clean_subcat_id = None

    # Validate category exists if provided
    if clean_cat_id:
        category = db.query(Category).filter(Category.id == clean_cat_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Category '{clean_cat_id}' does not exist",
            )

        # Validate subcategory belongs to category (if provided)
        if clean_subcat_id:
            subcategory = db.query(Subcategory).filter(
                Subcategory.id == clean_subcat_id
            ).first()
            if not subcategory:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Subcategory '{clean_subcat_id}' does not exist",
                )
            if subcategory.category_id != clean_cat_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Subcategory does not belong to the specified category",
                )
    else:
        # Category not specified / Any
        if clean_subcat_id:
            subcategory = db.query(Subcategory).filter(Subcategory.id == clean_subcat_id).first()
            if not subcategory:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Subcategory '{clean_subcat_id}' does not exist",
                )
            clean_cat_id = subcategory.category_id

    ticket_num = generate_ticket_number(db)

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
        category_id=clean_cat_id,
        subcategory_id=clean_subcat_id,
        priority=prio,
        status=TicketStatus.OPEN,
        is_blocked=False,
        response_due_at=resp_due,
        resolution_due_at=res_due,
    )
    db.add(ticket)
    db.flush()

    # Log initial creation journey event
    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="CREATED",
        description=f"Ticket {ticket.ticket_number} created with {prio.value} priority by {current_user.name}.",
        actor_id=current_user.id,
        new_value=prio.value,
    )

    db.commit()
    db.refresh(ticket)

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
    assignment_status: Optional[str] = None,
    is_blocked: Optional[bool] = None,
    sla_status_filter: Optional[str] = None,
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
    query = db.query(Ticket).options(
        joinedload(Ticket.creator),
        joinedload(Ticket.assignee),
        joinedload(Ticket.category),
        joinedload(Ticket.subcategory),
        joinedload(Ticket.blocked_by),
    )

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
        query = query.outerjoin(Ticket.category).filter(Category.department_id == department_id)
    if is_blocked is not None:
        query = query.filter(Ticket.is_blocked == is_blocked)

    # Dedicated Assignment filter (ASSIGNED, UNASSIGNED, ALL)
    if assignment_status:
        norm_assign = assignment_status.strip().lower()
        if norm_assign == "unassigned":
            query = query.filter(Ticket.assigned_to.is_(None))
        elif norm_assign == "assigned":
            query = query.filter(Ticket.assigned_to.isnot(None))

    # SLA filter at database level
    if sla_status_filter:
        norm_sla = sla_status_filter.strip().upper()
        now = datetime.utcnow()
        if norm_sla == "BREACHED":
            query = query.filter(
                or_(
                    # Closed/resolved after resolution_due_at
                    (Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])) & (Ticket.resolved_at > Ticket.resolution_due_at),
                    # Open/active beyond resolution_due_at
                    (~Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])) & (Ticket.resolution_due_at < now),
                    # First response breached
                    (~Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])) & (Ticket.first_responded_at.is_(None)) & (Ticket.response_due_at < now),
                )
            )
        elif norm_sla == "NO_SLA":
            query = query.filter(Ticket.resolution_due_at.is_(None))
        elif norm_sla == "IN_SLA":
            query = query.filter(
                Ticket.resolution_due_at.isnot(None),
                or_(
                    (Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])) & (Ticket.resolved_at <= Ticket.resolution_due_at),
                    (~Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])) & (Ticket.resolution_due_at >= now),
                )
            )

    # Count total matching records before pagination
    total = query.count()

    # Priority ranking expression for SQL ordering
    prio_rank = case(
        (Ticket.priority == TicketPriority.CRITICAL, 1),
        (Ticket.priority == TicketPriority.HIGH, 2),
        (Ticket.priority == TicketPriority.MEDIUM, 3),
        else_=4,
    )

    # Sorting with allowlist validation
    if sort_by:
        normalized_sort = sort_by.strip().lower()
        if normalized_sort not in TICKET_SORT_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort field '{sort_by}'. Allowed fields: {sorted(list(TICKET_SORT_FIELDS.keys()))}",
            )

        norm_order = (sort_order or "desc").strip().lower()
        if norm_order not in ("asc", "desc"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort order '{sort_order}'. Allowed values: ['asc', 'desc']",
            )

        if normalized_sort == "unassigned_first":
            # 1. Unassigned first, 2. Highest priority first, 3. Older tickets first
            query = query.order_by(
                case((Ticket.assigned_to.is_(None), 0), else_=1).asc(),
                prio_rank.asc(),
                Ticket.created_at.asc(),
            )
        elif normalized_sort == "priority":
            if norm_order == "desc":
                query = query.order_by(prio_rank.asc(), Ticket.created_at.desc())
            else:
                query = query.order_by(prio_rank.desc(), Ticket.created_at.asc())
        else:
            col = TICKET_SORT_FIELDS[normalized_sort]
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
    """Fetch ticket details by ID or ticket_number, ensuring ownership, assignee, or admin access."""
    ticket = (
        db.query(Ticket)
        .options(
            joinedload(Ticket.creator),
            joinedload(Ticket.assignee),
            joinedload(Ticket.category),
            joinedload(Ticket.subcategory),
            joinedload(Ticket.blocked_by),
        )
        .filter((Ticket.id == ticket_id) | (Ticket.ticket_number == ticket_id))
        .first()
    )
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

    ticket = get_ticket_by_id(db, ticket_id, current_user)

    # Validate assignee exists and is active
    assignee = db.query(User).filter(
        User.id == assign_in.assignee_id,
        User.is_active == True,
    ).first()
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assignee not found or is not active",
        )

    old_assignee_name = ticket.assignee.name if ticket.assignee else "Unassigned"
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

    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="ASSIGNED",
        description=f"Ticket assigned to {assignee.name} ({assignee.employee_id}) by {current_user.name}.",
        actor_id=current_user.id,
        old_value=old_assignee_name,
        new_value=f"{assignee.name} ({assignee.employee_id})",
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
# Ticket Blocking & Unblocking (SUPER_ADMIN only)
# ---------------------------------------------------------------------------

def block_ticket(db: Session, ticket_id: str, block_in: TicketBlock, current_user: User) -> Ticket:
    """Block a ticket with an administrative reason (SUPER_ADMIN only)."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SUPER_ADMIN can block tickets",
        )

    ticket = get_ticket_by_id(db, ticket_id, current_user)
    if ticket.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is already blocked",
        )

    clean_reason = block_in.reason.strip()
    ticket.is_blocked = True
    ticket.blocked_reason = clean_reason
    ticket.blocked_at = datetime.utcnow()
    ticket.blocked_by_id = current_user.id

    _add_system_comment(
        db,
        ticket.id,
        current_user.id,
        f"Ticket BLOCKED by {current_user.name}. Reason: {clean_reason}",
    )

    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="BLOCKED",
        description=f"Ticket blocked by {current_user.name}. Reason: {clean_reason}",
        actor_id=current_user.id,
        new_value=clean_reason,
    )

    # Notify creator and assignee if present
    recipients = {ticket.created_by}
    if ticket.assigned_to:
        recipients.add(ticket.assigned_to)

    for uid in recipients:
        if uid != current_user.id:
            _send_notification(
                db,
                user_id=uid,
                title=f"Ticket Blocked: {ticket.ticket_number}",
                message=f"Ticket '{ticket.title}' was placed on hold by Admin: {clean_reason}",
                ticket_id=ticket.id,
            )

    db.commit()
    db.refresh(ticket)
    return ticket


def unblock_ticket(db: Session, ticket_id: str, unblock_in: TicketUnblock, current_user: User) -> Ticket:
    """Unblock a ticket with confirmation (SUPER_ADMIN only)."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SUPER_ADMIN can unblock tickets",
        )

    ticket = get_ticket_by_id(db, ticket_id, current_user)
    if not ticket.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is not blocked",
        )

    old_reason = ticket.blocked_reason
    ticket.is_blocked = False
    ticket.blocked_reason = None
    ticket.blocked_at = None
    ticket.blocked_by_id = None

    note_text = f" Note: {unblock_in.reason.strip()}" if unblock_in.reason and unblock_in.reason.strip() else ""
    event_desc = f"Ticket UNBLOCKED by {current_user.name}.{note_text}"

    _add_system_comment(db, ticket.id, current_user.id, event_desc)

    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="UNBLOCKED",
        description=event_desc,
        actor_id=current_user.id,
        old_value=old_reason,
    )

    recipients = {ticket.created_by}
    if ticket.assigned_to:
        recipients.add(ticket.assigned_to)

    for uid in recipients:
        if uid != current_user.id:
            _send_notification(
                db,
                user_id=uid,
                title=f"Ticket Unblocked: {ticket.ticket_number}",
                message=f"Ticket '{ticket.title}' has been unblocked by Admin and resumed normal processing.",
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

    if ticket.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ticket is currently BLOCKED: {ticket.blocked_reason}. Only an administrator can unblock it before work continues.",
        )

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

    # --- lifecycle validation ---
    _assert_transition_allowed(ticket.status, new_status)

    if ticket.first_responded_at is None and current_user.id != ticket.created_by:
        ticket.first_responded_at = datetime.utcnow()

    old_status = ticket.status
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

    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="STATUS_CHANGED",
        description=f"Status transitioned from {old_status.value} to {new_status.value} by {current_user.name}.",
        actor_id=current_user.id,
        old_value=old_status.value,
        new_value=new_status.value,
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
    db.refresh(ticket)
    return ticket


def resolve_ticket(db: Session, ticket_id: str, resolve_in: TicketResolve, current_user: User) -> Ticket:
    """Mark ticket as RESOLVED — convenience endpoint around update_ticket_status."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    if ticket.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ticket is currently BLOCKED: {ticket.blocked_reason}.",
        )

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

    old_status = ticket.status
    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_at = datetime.utcnow()

    resolution_text = resolve_in.resolution_notes or "Ticket has been marked as resolved."
    _add_system_comment(db, ticket.id, current_user.id, f"Resolution: {resolution_text}")

    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="RESOLVED",
        description=f"Ticket marked as RESOLVED by {current_user.name}. Resolution: {resolution_text}",
        actor_id=current_user.id,
        old_value=old_status.value,
        new_value=TicketStatus.RESOLVED.value,
    )

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

    if ticket.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ticket is currently BLOCKED: {ticket.blocked_reason}.",
        )

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

    old_status = ticket.status
    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = datetime.utcnow()

    _add_system_comment(db, ticket.id, current_user.id, "Ticket closed.")

    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="CLOSED",
        description=f"Ticket closed by {current_user.name}.",
        actor_id=current_user.id,
        old_value=old_status.value,
        new_value=TicketStatus.CLOSED.value,
    )

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


# ---------------------------------------------------------------------------
# Ticket Journey
# ---------------------------------------------------------------------------

def get_ticket_journey(db: Session, ticket_id: str, current_user: User) -> List[TicketJourney]:
    """Retrieve chronological ticket journey events."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    events = (
        db.query(TicketJourney)
        .options(joinedload(TicketJourney.actor))
        .filter(TicketJourney.ticket_id == ticket.id)
        .order_by(TicketJourney.created_at.asc())
        .all()
    )

    # Backward compatibility: synthesize events if none recorded in DB yet
    if not events:
        synth: List[TicketJourney] = []
        synth.append(
            TicketJourney(
                id=f"synth-{ticket.id}-created",
                ticket_id=ticket.id,
                actor_id=ticket.created_by,
                event_type="CREATED",
                description=f"Ticket created: {ticket.title}",
                created_at=ticket.created_at,
            )
        )
        if ticket.assigned_to:
            synth.append(
                TicketJourney(
                    id=f"synth-{ticket.id}-assigned",
                    ticket_id=ticket.id,
                    actor_id=ticket.assigned_to,
                    event_type="ASSIGNED",
                    description=f"Assigned to {ticket.assignee.name if ticket.assignee else 'employee'}",
                    created_at=ticket.first_responded_at or ticket.created_at,
                )
            )
        if ticket.resolved_at:
            synth.append(
                TicketJourney(
                    id=f"synth-{ticket.id}-resolved",
                    ticket_id=ticket.id,
                    actor_id=ticket.assigned_to or ticket.created_by,
                    event_type="RESOLVED",
                    description="Ticket marked as RESOLVED",
                    created_at=ticket.resolved_at,
                )
            )
        if ticket.closed_at:
            synth.append(
                TicketJourney(
                    id=f"synth-{ticket.id}-closed",
                    ticket_id=ticket.id,
                    actor_id=ticket.created_by,
                    event_type="CLOSED",
                    description="Ticket closed",
                    created_at=ticket.closed_at,
                )
            )
        return synth

    return events


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def add_comment(
    db: Session, ticket_id: str, comment_in: TicketCommentCreate, current_user: User
) -> TicketComment:
    """Add a comment or internal note to a ticket."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    if ticket.is_blocked and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is currently BLOCKED. Only administrators can comment on blocked tickets.",
        )

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

    # Log in journey
    journey_type = "INTERNAL_NOTE" if comment_in.is_internal else "COMMENT_ADDED"
    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type=journey_type,
        description=f"{'Internal note' if comment_in.is_internal else 'Comment'} added by {current_user.name}.",
        actor_id=current_user.id,
    )

    db.commit()
    db.refresh(comment)
    return comment


def get_ticket_comments(
    db: Session, ticket_id: str, current_user: User
) -> List[TicketComment]:
    """Retrieve comments for a ticket. Hide internal notes for non-assigned employees."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    query = (
        db.query(TicketComment)
        .options(joinedload(TicketComment.user))
        .filter(TicketComment.ticket_id == ticket.id)
    )
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

    if ticket.is_blocked and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is currently BLOCKED. Cannot attach files.",
        )

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

    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="ATTACHMENT_ADDED",
        description=f"File attached: {file.filename} by {current_user.name}.",
        actor_id=current_user.id,
        new_value=file.filename,
    )

    db.commit()
    db.refresh(attachment)
    return attachment


async def add_multiple_attachments(
    db: Session, ticket_id: str, files: List[UploadFile], current_user: User
) -> List[TicketAttachment]:
    """Validate and upload multiple files to a ticket in a single operation."""
    ticket = get_ticket_by_id(db, ticket_id, current_user)

    if ticket.is_blocked and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is currently BLOCKED. Cannot attach files.",
        )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file must be provided for upload",
        )

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

    _log_journey_event(
        db,
        ticket_id=ticket.id,
        event_type="ATTACHMENTS_ADDED",
        description=f"{len(created_attachments)} files attached by {current_user.name}.",
        actor_id=current_user.id,
    )

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
        .options(joinedload(TicketAttachment.uploader))
        .filter(TicketAttachment.ticket_id == ticket.id)
        .order_by(TicketAttachment.created_at.asc())
        .all()
    )

from typing import List, Optional, Union
from fastapi import APIRouter, Depends, status, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.ticket import TicketPriority, TicketStatus
from app.schemas.ticket import TicketCreate, TicketRead, TicketStatusUpdate, TicketResolve, TicketAssign, TicketReopen
from app.schemas.pagination import PaginatedResponse
from app.dependencies import get_current_user, require_role
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new ticket."""
    return ticket_service.create_ticket(db, ticket_in, current_user)


@router.get("", response_model=Union[PaginatedResponse[TicketRead], List[TicketRead]])
def list_tickets(
    response: Response,
    search: Optional[str] = Query(None, description="Search ticket #, title, or keywords"),
    priority: Optional[TicketPriority] = Query(None, description="Filter tickets by priority"),
    status: Optional[TicketStatus] = Query(None, description="Filter tickets by status"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    subcategory_id: Optional[str] = Query(None, description="Filter by subcategory ID"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user ID"),
    created_by: Optional[str] = Query(None, description="Filter by creator user ID"),
    sort_by: Optional[str] = Query("created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page (1..100)"),
    envelope: bool = Query(False, description="Wrap output in PaginatedResponse envelope"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List tickets for the logged in user based on role, with search, filtering, sorting, and pagination."""
    items, total, current_page, total_pages = ticket_service.get_user_tickets(
        db,
        current_user,
        search=search,
        priority=priority,
        status_filter=status,
        department_id=department_id,
        category_id=category_id,
        subcategory_id=subcategory_id,
        assigned_to=assigned_to,
        created_by=created_by,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )

    effective_page_size = page_size if page_size is not None else (len(items) or 10)
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(current_page)
    response.headers["X-Page-Size"] = str(effective_page_size)
    response.headers["X-Total-Pages"] = str(total_pages)

    if envelope:
        return PaginatedResponse[TicketRead](
            items=items,
            total=total,
            page=current_page,
            page_size=effective_page_size,
            total_pages=total_pages,
        )
    return items


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get ticket detail by ID."""
    return ticket_service.get_ticket_by_id(db, ticket_id, current_user)


@router.put("/{ticket_id}/assign", response_model=TicketRead)
def assign_ticket(
    ticket_id: str,
    assign_in: TicketAssign,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Assign a ticket to an active employee. SUPER_ADMIN only."""
    return ticket_service.assign_ticket(db, ticket_id, assign_in, current_user)


@router.put("/{ticket_id}/status", response_model=TicketRead)
def update_status(
    ticket_id: str,
    update_in: TicketStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update ticket status with lifecycle and permission validation."""
    return ticket_service.update_ticket_status(db, ticket_id, update_in, current_user)


@router.put("/{ticket_id}/resolve", response_model=TicketRead)
def resolve_ticket(
    ticket_id: str,
    resolve_in: TicketResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resolve ticket (Assigned Employee or SUPER_ADMIN only)."""
    return ticket_service.resolve_ticket(db, ticket_id, resolve_in, current_user)


@router.put("/{ticket_id}/close", response_model=TicketRead)
def close_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Close ticket. Creator only after RESOLVED; SUPER_ADMIN can close any ticket."""
    return ticket_service.close_ticket(db, ticket_id, current_user)


@router.put("/{ticket_id}/reopen", response_model=TicketRead)
def reopen_ticket(
    ticket_id: str,
    reopen_in: Optional[TicketReopen] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reopen ticket. Creator or SUPER_ADMIN only from RESOLVED or CLOSED status."""
    reason = reopen_in.reason if reopen_in else None
    return ticket_service.reopen_ticket(db, ticket_id, current_user, reason=reason)

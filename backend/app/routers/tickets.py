from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.ticket import TicketCreate, TicketRead, TicketStatusUpdate, TicketResolve
from app.dependencies import get_current_user, require_role
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new ticket."""
    return ticket_service.create_ticket(db, ticket_in, current_user)


@router.get("", response_model=List[TicketRead])
def list_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List tickets for the logged in user based on role."""
    return ticket_service.get_user_tickets(db, current_user)


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket detail by ID."""
    return ticket_service.get_ticket_by_id(db, ticket_id, current_user)


@router.put("/{ticket_id}/status", response_model=TicketRead)
def update_status(
    ticket_id: str,
    update_in: TicketStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update ticket status."""
    return ticket_service.update_ticket_status(db, ticket_id, update_in, current_user)


@router.put("/{ticket_id}/resolve", response_model=TicketRead)
def resolve_ticket(
    ticket_id: str,
    resolve_in: TicketResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve ticket (Assigned Employee/Admin)."""
    return ticket_service.resolve_ticket(db, ticket_id, resolve_in, current_user)


@router.put("/{ticket_id}/close", response_model=TicketRead)
def close_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close ticket."""
    return ticket_service.close_ticket(db, ticket_id, current_user)

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.ticket_comment import TicketCommentCreate, TicketCommentRead
from app.dependencies import get_current_user
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["Comments"])


@router.get("/{ticket_id}/comments", response_model=List[TicketCommentRead])
def get_comments(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List comments for ticket."""
    return ticket_service.get_ticket_comments(db, ticket_id, current_user)


@router.post("/{ticket_id}/comments", response_model=TicketCommentRead, status_code=status.HTTP_201_CREATED)
def add_comment(
    ticket_id: str,
    comment_in: TicketCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment or internal note to a ticket."""
    return ticket_service.add_comment(db, ticket_id, comment_in, current_user)

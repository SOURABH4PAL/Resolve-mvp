from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.department import Department
from app.models.category import Category
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=Dict[str, Any])
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve operational dashboard statistics and status breakdown."""
    base_query = db.query(Ticket)
    if current_user.role != UserRole.SUPER_ADMIN:
        base_query = base_query.filter(
            (Ticket.created_by == current_user.id) | (Ticket.assigned_to == current_user.id)
        )

    total_tickets = base_query.count()
    open_tickets = base_query.filter(Ticket.status == TicketStatus.OPEN).count()
    assigned_tickets = base_query.filter(Ticket.status == TicketStatus.ASSIGNED).count()
    in_progress_tickets = base_query.filter(Ticket.status == TicketStatus.IN_PROGRESS).count()
    resolved_tickets = base_query.filter(Ticket.status == TicketStatus.RESOLVED).count()
    closed_tickets = base_query.filter(Ticket.status == TicketStatus.CLOSED).count()

    # Priority counts
    priority_counts = {
        "LOW": base_query.filter(Ticket.priority == TicketPriority.LOW).count(),
        "MEDIUM": base_query.filter(Ticket.priority == TicketPriority.MEDIUM).count(),
        "HIGH": base_query.filter(Ticket.priority == TicketPriority.HIGH).count(),
        "CRITICAL": base_query.filter(Ticket.priority == TicketPriority.CRITICAL).count(),
    }

    # Recent tickets
    recent = (
        base_query.order_by(Ticket.created_at.desc())
        .limit(5)
        .all()
    )
    recent_list = [
        {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "title": t.title,
            "priority": t.priority.value if hasattr(t.priority, "value") else str(t.priority),
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in recent
    ]

    stats: Dict[str, Any] = {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "assigned_tickets": assigned_tickets,
        "in_progress_tickets": in_progress_tickets,
        "resolved_tickets": resolved_tickets,
        "closed_tickets": closed_tickets,
        "tickets_by_priority": priority_counts,
        "recent_tickets": recent_list,
    }

    if current_user.role == UserRole.SUPER_ADMIN:
        stats["total_users"] = db.query(User).count()
        stats["total_departments"] = db.query(Department).count()
        stats["total_categories"] = db.query(Category).count()

    return stats

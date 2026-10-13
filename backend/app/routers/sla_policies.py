from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.sla_policy import SlaPolicy
from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_escalation import TicketEscalation, EscalationStatus
from app.models.ticket_comment import TicketComment
from app.models.notification import Notification
from app.models.department import Department
from app.schemas.sla_policy import SlaPolicyCreate, SlaPolicyUpdate, SlaPolicyRead
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/sla-policies", tags=["SLA Policies"])


class DueCalculationRequest(BaseModel):
    priority: str = "MEDIUM"
    sla_policy_id: Optional[str] = None
    created_at: Optional[datetime] = None


class DueCalculationResponse(BaseModel):
    first_response_due_at: datetime
    resolution_due_at: datetime
    first_response_hours: int
    resolution_hours: int


DEFAULT_PRIORITY_HOURS = {
    "CRITICAL": (1, 4),
    "HIGH": (4, 24),
    "MEDIUM": (8, 48),
    "LOW": (24, 72),
}


@router.get("", response_model=List[SlaPolicyRead])
def list_sla_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all SLA policies."""
    return db.query(SlaPolicy).filter(SlaPolicy.is_active == True).all()


@router.post("", response_model=SlaPolicyRead, status_code=status.HTTP_201_CREATED)
def create_sla_policy(
    policy_in: SlaPolicyCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Create a new SLA policy (Admin only)."""
    policy = SlaPolicy(
        name=policy_in.name,
        first_response_hours=policy_in.first_response_hours,
        resolution_hours=policy_in.resolution_hours,
        priority=policy_in.priority,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/{policy_id}", response_model=SlaPolicyRead)
def get_sla_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve an SLA policy by ID."""
    policy = db.query(SlaPolicy).filter(SlaPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found")
    return policy


@router.put("/{policy_id}", response_model=SlaPolicyRead)
def update_sla_policy(
    policy_id: str,
    policy_in: SlaPolicyUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Update an SLA policy (Admin only)."""
    policy = db.query(SlaPolicy).filter(SlaPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found")

    update_data = policy_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(policy, field, val)

    db.commit()
    db.refresh(policy)
    return policy


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sla_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Delete an SLA policy (Admin only)."""
    policy = db.query(SlaPolicy).filter(SlaPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found")
    policy.is_active = False
    db.commit()
    return None


@router.post("/calculate-due", response_model=DueCalculationResponse)
def calculate_due_times(
    req: DueCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate first response and resolution due timestamps for SLA tracking."""
    base_time = req.created_at or datetime.utcnow()
    resp_hours, res_hours = DEFAULT_PRIORITY_HOURS.get(req.priority.upper(), (8, 48))

    if req.sla_policy_id:
        policy = db.query(SlaPolicy).filter(SlaPolicy.id == req.sla_policy_id).first()
        if policy:
            resp_hours = policy.first_response_hours
            res_hours = policy.resolution_hours

    return DueCalculationResponse(
        first_response_due_at=base_time + timedelta(hours=resp_hours),
        resolution_due_at=base_time + timedelta(hours=res_hours),
        first_response_hours=resp_hours,
        resolution_hours=res_hours,
    )


@router.post("/check-escalations")
def check_sla_breaches_and_escalate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Check for tickets that have breached SLA response times without first response.
    Automatically raises an escalation and alerts the department lead / Super Admin.
    """
    now = datetime.utcnow()
    # Find active tickets that are not resolved or closed, and have passed response_due_at without first response
    breached_tickets = db.query(Ticket).filter(
        Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
        Ticket.first_responded_at == None,
        Ticket.response_due_at != None,
        Ticket.response_due_at < now,
    ).all()

    escalated_results = []
    admins = db.query(User).filter(User.role == UserRole.SUPER_ADMIN, User.is_active == True).all()

    for ticket in breached_tickets:
        # Check if an automated SLA escalation has already been logged for this ticket
        existing_esc = db.query(TicketEscalation).filter(
            TicketEscalation.ticket_id == ticket.id,
            TicketEscalation.escalation_type == "SLA_RESPONSE_BREACH",
        ).first()

        if existing_esc:
            continue

        # Create SLA Breach Escalation
        reason_text = (
            f"SLA Response Breach: Ticket was not responded to within target SLA window "
            f"({ticket.priority.value if hasattr(ticket.priority, 'value') else ticket.priority}). "
            f"Deadline was {ticket.response_due_at.strftime('%Y-%m-%d %H:%M UTC')}."
        )

        escalation = TicketEscalation(
            ticket_id=ticket.id,
            escalation_type="SLA_RESPONSE_BREACH",
            raised_by=current_user.id,
            reason=reason_text,
            status=EscalationStatus.OPEN,
        )
        db.add(escalation)

        # Audit comment
        system_comment = TicketComment(
            ticket_id=ticket.id,
            user_id=current_user.id,
            content=f"[AUTOMATED SLA ESCALATION] {reason_text}. Escalated to Department Management & Super Admin.",
            is_internal=False,
        )
        db.add(system_comment)

        # Raise concern to department lead or admin
        notif_recipients = set(a.id for a in admins)
        if ticket.category and ticket.category.department_id:
            dept = db.query(Department).filter(Department.id == ticket.category.department_id).first()
            if dept and dept.responsible_user_id:
                notif_recipients.add(dept.responsible_user_id)
                # Reassign ticket if not yet assigned
                if not ticket.assigned_to:
                    ticket.assigned_to = dept.responsible_user_id
                    ticket.status = TicketStatus.ASSIGNED

        # Send notifications
        for r_id in notif_recipients:
            r_user = db.query(User).filter(User.id == r_id).first()
            db.add(Notification(
                user_id=r_id,
                recipient_email=r_user.email if r_user else "admin@resolvehub.com",
                sender_email="system@resolvehub.com",
                ticket_id=ticket.id,
                ticket_number=ticket.ticket_number,
                title=f"🚨 SLA Breach Escalation: {ticket.ticket_number}",
                message=f"Ticket '{ticket.title}' exceeded SLA response time without first response. Immediate attention required.",
            ))

        escalated_results.append({
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "priority": ticket.priority.value if hasattr(ticket.priority, 'value') else ticket.priority,
            "response_due_at": ticket.response_due_at.isoformat() if ticket.response_due_at else None,
        })

    db.commit()
    return {
        "status": "success",
        "checked_at": now.isoformat(),
        "total_breached_found": len(breached_tickets),
        "newly_escalated_count": len(escalated_results),
        "escalated_tickets": escalated_results,
    }

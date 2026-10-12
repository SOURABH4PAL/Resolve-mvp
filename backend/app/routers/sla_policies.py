from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.sla_policy import SlaPolicy
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

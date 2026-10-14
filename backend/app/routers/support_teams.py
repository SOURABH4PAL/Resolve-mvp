from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.support_team import SupportTeam
from app.schemas.support_team import SupportTeamCreate, SupportTeamUpdate, SupportTeamRead
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/support-teams", tags=["Support Teams"])


@router.get("", response_model=List[SupportTeamRead])
def list_support_teams(
    department_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all support teams, optionally filtered by department."""
    query = db.query(SupportTeam).filter(SupportTeam.is_active == True)
    if department_id:
        query = query.filter(SupportTeam.department_id == department_id)
    return query.all()


@router.post("", response_model=SupportTeamRead, status_code=status.HTTP_201_CREATED)
def create_support_team(
    team_in: SupportTeamCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Create a support team (Admin only)."""
    team = SupportTeam(
        name=team_in.name,
        department_id=team_in.department_id,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.get("/{team_id}", response_model=SupportTeamRead)
def get_support_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single support team by ID."""
    team = db.query(SupportTeam).filter(SupportTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support team not found")
    return team


@router.put("/{team_id}", response_model=SupportTeamRead)
def update_support_team(
    team_id: str,
    team_in: SupportTeamUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Update support team (Admin only)."""
    team = db.query(SupportTeam).filter(SupportTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support team not found")

    update_data = team_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(team, key, val)

    db.commit()
    db.refresh(team)
    return team


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_support_team(
    team_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Soft delete support team (Admin only)."""
    team = db.query(SupportTeam).filter(SupportTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support team not found")

    team.is_active = False
    db.commit()
    return None

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserRead
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user information."""
    return current_user


@router.get("", response_model=List[UserRead])
def list_employees(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Return all active employees. Used by the admin UI for assignee dropdown.
    SUPER_ADMIN only.
    """
    return (
        db.query(User)
        .filter(User.is_active == True, User.role == UserRole.EMPLOYEE)  # noqa: E712
        .order_by(User.name.asc())
        .all()
    )

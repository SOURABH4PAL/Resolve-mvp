from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.department import Department
from app.models.user import User
from app.schemas.department import DepartmentRead
from app.dependencies import get_current_user

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentRead])
def list_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all active departments."""
    return db.query(Department).filter(Department.is_active == True).order_by(Department.name.asc()).all()

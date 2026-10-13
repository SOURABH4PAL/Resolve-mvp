from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.department import Department
from app.models.category import Category
from app.models.user import User, UserRole
from app.schemas.department import DepartmentRead, DepartmentCreate, DepartmentUpdate
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentRead])
def list_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all active departments."""
    return db.query(Department).filter(Department.is_active == True).order_by(Department.name.asc()).all()


@router.get("/{dept_id}", response_model=DepartmentRead)
def get_department(
    dept_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get department by ID."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return dept


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new department (SUPER_ADMIN only)."""
    existing = db.query(Department).filter(Department.name.ilike(dept_in.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with this name already exists",
        )
    dept = Department(
        name=dept_in.name.strip(),
        department_email=dept_in.department_email,
        is_active=dept_in.is_active,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/{dept_id}", response_model=DepartmentRead)
def update_department(
    dept_id: str,
    dept_in: DepartmentUpdate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Update a department (SUPER_ADMIN only)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if dept_in.name is not None:
        dept.name = dept_in.name.strip()
    if dept_in.department_email is not None:
        dept.department_email = dept_in.department_email
    if dept_in.is_active is not None:
        dept.is_active = dept_in.is_active

    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}", status_code=status.HTTP_200_OK)
def delete_department(
    dept_id: str,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Safe delete or deactivate a department (SUPER_ADMIN only)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    category_count = db.query(Category).filter(Category.department_id == dept_id).count()
    user_count = db.query(User).filter(User.department_id == dept_id).count()
    if category_count > 0 or user_count > 0:
        dept.is_active = False
        db.commit()
        return {
            "detail": "Department has associated categories or users; deactivated successfully instead of deletion",
            "deactivated": True,
        }

    db.delete(dept)
    db.commit()
    return {"detail": "Department deleted successfully", "deleted": True}

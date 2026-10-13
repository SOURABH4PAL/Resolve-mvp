import math
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.ticket import Ticket
from app.models.ticket_comment import TicketComment
from app.schemas.user import UserRead, UserStatusUpdate, UserCreate, UserUpdate
from app.schemas.pagination import PaginatedResponse
from app.dependencies import get_current_user, require_role
from app.utils.security import get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])

USER_SORT_FIELDS = {
    "name": User.name,
    "email": User.email,
    "employee_id": User.employee_id,
    "created_at": User.created_at,
}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user information."""
    return current_user


@router.get("", response_model=Union[PaginatedResponse[UserRead], List[UserRead]])
def list_employees(
    response: Response,
    search: Optional[str] = Query(None, description="Search by name, email, or employee ID"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    is_active: Optional[bool] = Query(True, description="Filter active status"),
    sort_by: Optional[str] = Query("name", description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page (1..100)"),
    envelope: bool = Query(False, description="Wrap output in PaginatedResponse envelope"),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Return employees matching criteria. SUPER_ADMIN only."""
    query = db.query(User).filter(User.role == UserRole.EMPLOYEE)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if department_id:
        query = query.filter(User.department_id == department_id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (User.name.ilike(search_term))
            | (User.email.ilike(search_term))
            | (User.employee_id.ilike(search_term))
        )

    total = query.count()

    # Sorting
    if sort_by:
        normalized_sort = sort_by.strip().lower()
        if normalized_sort not in USER_SORT_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort field '{sort_by}'. Allowed fields: {sorted(list(USER_SORT_FIELDS.keys()))}",
            )
        col = USER_SORT_FIELDS[normalized_sort]
        norm_order = (sort_order or "asc").strip().lower()
        if norm_order not in ("asc", "desc"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort order '{sort_order}'. Allowed values: ['asc', 'desc']",
            )
        if norm_order == "asc":
            query = query.order_by(col.asc())
        else:
            query = query.order_by(col.desc())
    else:
        query = query.order_by(User.name.asc())

    # Pagination
    if page is not None:
        effective_page_size = page_size if page_size is not None else 10
        total_pages = math.ceil(total / effective_page_size) if total > 0 else 0
        offset = (page - 1) * effective_page_size
        items = query.offset(offset).limit(effective_page_size).all()
        current_page = page
    else:
        items = query.all()
        effective_page_size = len(items) if items else 10
        current_page = 1
        total_pages = 1 if total > 0 else 0

    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(current_page)
    response.headers["X-Page-Size"] = str(effective_page_size)
    response.headers["X-Total-Pages"] = str(total_pages)

    if envelope:
        return PaginatedResponse[UserRead](
            items=items,
            total=total,
            page=current_page,
            page_size=effective_page_size,
            total_pages=total_pages,
        )
    return items


@router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve user details by ID (Admin or the user themselves)."""
    if current_user.role != UserRole.SUPER_ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}/status", response_model=UserRead)
def update_user_status(
    user_id: str,
    status_in: UserStatusUpdate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Activate or deactivate a user account (SUPER_ADMIN only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id and not status_in.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admin cannot deactivate their own account",
        )
    user.is_active = status_in.is_active
    db.commit()
    db.refresh(user)
    return user


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new employee/user (SUPER_ADMIN only)."""
    # Check email uniqueness
    if db.query(User).filter(User.email == user_in.email.strip().lower()).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists",
        )

    # Check employee_id uniqueness
    if db.query(User).filter(User.employee_id == user_in.employee_id.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this employee ID already exists",
        )

    # Validate department if provided
    if user_in.department_id:
        dept = db.query(Department).filter(Department.id == user_in.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department '{user_in.department_id}' does not exist",
            )

    new_user = User(
        employee_id=user_in.employee_id.strip(),
        name=user_in.name.strip(),
        email=user_in.email.strip().lower(),
        password_hash=get_password_hash(user_in.password),
        role=user_in.role or UserRole.EMPLOYEE,
        department_id=user_in.department_id,
        is_active=user_in.is_active,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    user_in: UserUpdate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Update employee details, role, department, status, or password (SUPER_ADMIN only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_in.email is not None:
        new_email = user_in.email.strip().lower()
        if new_email != user.email:
            existing = db.query(User).filter(User.email == new_email).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Another user is already using this email address",
                )
            user.email = new_email

    if user_in.employee_id is not None:
        new_emp_id = user_in.employee_id.strip()
        if new_emp_id != user.employee_id:
            existing = db.query(User).filter(User.employee_id == new_emp_id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Another user is already using this employee ID",
                )
            user.employee_id = new_emp_id

    if user_in.name is not None:
        user.name = user_in.name.strip()

    if user_in.department_id is not None:
        if user_in.department_id == "" or user_in.department_id is None:
            user.department_id = None
        else:
            dept = db.query(Department).filter(Department.id == user_in.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department '{user_in.department_id}' does not exist",
                )
            user.department_id = user_in.department_id

    if user_in.role is not None:
        user.role = user_in.role

    if user_in.is_active is not None:
        if user.id == current_user.id and not user_in.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Super Admin cannot deactivate their own account",
            )
        user.is_active = user_in.is_active

    if user_in.password is not None and user_in.password.strip():
        user.password_hash = get_password_hash(user_in.password.strip())

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: str,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Delete or safely deactivate an employee (SUPER_ADMIN only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admin cannot delete their own account",
        )

    # Check references in tickets, assigned tickets, comments
    created_tickets_count = db.query(Ticket).filter(Ticket.created_by == user_id).count()
    assigned_tickets_count = db.query(Ticket).filter(Ticket.assigned_to == user_id).count()
    comments_count = db.query(TicketComment).filter(TicketComment.user_id == user_id).count()

    if created_tickets_count > 0 or assigned_tickets_count > 0 or comments_count > 0:
        user.is_active = False
        db.commit()
        return {
            "detail": f"User has associated activity ({created_tickets_count} tickets created, {assigned_tickets_count} assigned); account was deactivated instead of deleted.",
            "deactivated": True,
            "deleted": False,
        }

    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully", "deleted": True, "deactivated": False}

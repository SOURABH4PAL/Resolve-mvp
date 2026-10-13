import math
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.ticket import Ticket
from app.schemas.category import CategoryRead, CategoryCreate, CategoryUpdate
from app.schemas.pagination import PaginatedResponse
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/categories", tags=["Categories"])

CATEGORY_SORT_FIELDS = {
    "name": Category.name,
    "created_at": Category.created_at,
}


@router.get("", response_model=Union[PaginatedResponse[CategoryRead], List[CategoryRead]])
def list_categories(
    response: Response,
    search: Optional[str] = Query(None, description="Search by category name or description"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    sort_by: Optional[str] = Query("name", description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page (1..100)"),
    envelope: bool = Query(False, description="Wrap output in PaginatedResponse envelope"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List categories, optionally filtered by department_id or searched by name/description."""
    query = db.query(Category).filter(Category.is_active == True)

    if department_id:
        query = query.filter(Category.department_id == department_id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Category.name.ilike(search_term))
            | (Category.description.ilike(search_term))
        )

    total = query.count()

    # Sorting
    if sort_by:
        normalized_sort = sort_by.strip().lower()
        if normalized_sort not in CATEGORY_SORT_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort field '{sort_by}'. Allowed fields: {sorted(list(CATEGORY_SORT_FIELDS.keys()))}",
            )
        col = CATEGORY_SORT_FIELDS[normalized_sort]
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
        query = query.order_by(Category.name.asc())

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
        return PaginatedResponse[CategoryRead](
            items=items,
            total=total,
            page=current_page,
            page_size=effective_page_size,
            total_pages=total_pages,
        )
    return items


@router.get("/{category_id}", response_model=CategoryRead)
def get_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single category by ID."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return cat


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new category (SUPER_ADMIN only)."""
    dept = db.query(Department).filter(
        Department.id == category_in.department_id, Department.is_active == True
    ).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    existing = db.query(Category).filter(
        Category.department_id == category_in.department_id,
        Category.name.ilike(category_in.name.strip()),
        Category.is_active == True,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists in the department",
        )

    cat = Category(
        department_id=category_in.department_id,
        name=category_in.name.strip(),
        description=category_in.description,
        is_active=category_in.is_active,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: str,
    category_in: CategoryUpdate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Update a category (SUPER_ADMIN only)."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if category_in.department_id is not None:
        dept = db.query(Department).filter(Department.id == category_in.department_id).first()
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        cat.department_id = category_in.department_id

    if category_in.name is not None:
        cat.name = category_in.name.strip()
    if category_in.description is not None:
        cat.description = category_in.description
    if category_in.is_active is not None:
        cat.is_active = category_in.is_active

    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(
    category_id: str,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Safe delete or deactivate a category (SUPER_ADMIN only)."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    ticket_count = db.query(Ticket).filter(Ticket.category_id == category_id).count()
    if ticket_count > 0:
        cat.is_active = False
        db.commit()
        return {
            "detail": "Category has associated tickets; deactivated successfully instead of deletion",
            "deactivated": True,
        }

    db.delete(cat)
    db.commit()
    return {"detail": "Category deleted successfully", "deleted": True}

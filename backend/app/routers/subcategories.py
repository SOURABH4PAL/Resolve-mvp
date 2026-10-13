import math
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.subcategory import Subcategory
from app.models.category import Category
from app.models.user import User, UserRole
from app.models.ticket import Ticket
from app.schemas.subcategory import SubcategoryRead, SubcategoryCreate, SubcategoryUpdate
from app.schemas.pagination import PaginatedResponse
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/subcategories", tags=["Subcategories"])

SUBCATEGORY_SORT_FIELDS = {
    "name": Subcategory.name,
    "created_at": Subcategory.created_at,
}


@router.get("", response_model=Union[PaginatedResponse[SubcategoryRead], List[SubcategoryRead]])
def list_subcategories(
    response: Response,
    search: Optional[str] = Query(None, description="Search subcategory or parent category name"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    sort_by: Optional[str] = Query("name", description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page (1..100)"),
    envelope: bool = Query(False, description="Wrap output in PaginatedResponse envelope"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List subcategories, optionally filtered by category_id/department_id or searched by name."""
    query = db.query(Subcategory).filter(Subcategory.is_active == True)

    joined_category = False
    if department_id:
        query = query.join(Subcategory.category).filter(Category.department_id == department_id)
        joined_category = True

    if category_id:
        query = query.filter(Subcategory.category_id == category_id)

    if search:
        search_term = f"%{search.strip()}%"
        if not joined_category:
            query = query.join(Subcategory.category)
            joined_category = True
        query = query.filter(
            (Subcategory.name.ilike(search_term))
            | (Subcategory.description.ilike(search_term))
            | (Category.name.ilike(search_term))
        )

    total = query.count()

    # Sorting
    if sort_by:
        normalized_sort = sort_by.strip().lower()
        if normalized_sort not in SUBCATEGORY_SORT_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort field '{sort_by}'. Allowed fields: {sorted(list(SUBCATEGORY_SORT_FIELDS.keys()))}",
            )
        col = SUBCATEGORY_SORT_FIELDS[normalized_sort]
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
        query = query.order_by(Subcategory.name.asc())

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
        return PaginatedResponse[SubcategoryRead](
            items=items,
            total=total,
            page=current_page,
            page_size=effective_page_size,
            total_pages=total_pages,
        )
    return items


@router.get("/{subcategory_id}", response_model=SubcategoryRead)
def get_subcategory(
    subcategory_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single subcategory by ID."""
    sub = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcategory not found")
    return sub


@router.post("", response_model=SubcategoryRead, status_code=status.HTTP_201_CREATED)
def create_subcategory(
    subcategory_in: SubcategoryCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new subcategory (SUPER_ADMIN only)."""
    parent_cat = db.query(Category).filter(
        Category.id == subcategory_in.category_id, Category.is_active == True
    ).first()
    if not parent_cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent category not found or is inactive",
        )

    existing = db.query(Subcategory).filter(
        Subcategory.category_id == subcategory_in.category_id,
        Subcategory.name.ilike(subcategory_in.name.strip()),
        Subcategory.is_active == True,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A subcategory with this name already exists in the selected category",
        )

    sub = Subcategory(
        category_id=subcategory_in.category_id,
        name=subcategory_in.name.strip(),
        description=subcategory_in.description,
        is_active=subcategory_in.is_active,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.put("/{subcategory_id}", response_model=SubcategoryRead)
def update_subcategory(
    subcategory_id: str,
    subcategory_in: SubcategoryUpdate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Update a subcategory (SUPER_ADMIN only)."""
    sub = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcategory not found")

    if subcategory_in.category_id is not None:
        parent_cat = db.query(Category).filter(Category.id == subcategory_in.category_id).first()
        if not parent_cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent category not found")
        sub.category_id = subcategory_in.category_id

    if subcategory_in.name is not None:
        sub.name = subcategory_in.name.strip()
    if subcategory_in.description is not None:
        sub.description = subcategory_in.description
    if subcategory_in.is_active is not None:
        sub.is_active = subcategory_in.is_active

    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/{subcategory_id}", status_code=status.HTTP_200_OK)
def delete_subcategory(
    subcategory_id: str,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Safe delete or deactivate a subcategory (SUPER_ADMIN only)."""
    sub = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcategory not found")

    ticket_count = db.query(Ticket).filter(Ticket.subcategory_id == subcategory_id).count()
    if ticket_count > 0:
        sub.is_active = False
        db.commit()
        return {
            "detail": "Subcategory has associated tickets; deactivated successfully instead of deletion",
            "deactivated": True,
        }

    db.delete(sub)
    db.commit()
    return {"detail": "Subcategory deleted successfully", "deleted": True}

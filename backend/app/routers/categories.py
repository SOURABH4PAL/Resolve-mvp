from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryRead
from app.dependencies import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryRead])
def list_categories(
    department_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List categories, optionally filtered by department_id."""
    query = db.query(Category).filter(Category.is_active == True)
    if department_id:
        query = query.filter(Category.department_id == department_id)
    return query.order_by(Category.name.asc()).all()

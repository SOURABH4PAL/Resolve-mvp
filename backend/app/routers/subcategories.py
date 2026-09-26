from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.subcategory import Subcategory
from app.models.user import User
from app.schemas.subcategory import SubcategoryRead
from app.dependencies import get_current_user

router = APIRouter(prefix="/subcategories", tags=["Subcategories"])


@router.get("", response_model=List[SubcategoryRead])
def list_subcategories(
    category_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List subcategories, optionally filtered by category_id."""
    query = db.query(Subcategory).filter(Subcategory.is_active == True)
    if category_id:
        query = query.filter(Subcategory.category_id == category_id)
    return query.order_by(Subcategory.name.asc()).all()

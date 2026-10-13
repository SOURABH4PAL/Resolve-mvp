from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.faq import FAQ
from app.schemas.faq import FAQCreate, FAQUpdate, FAQRead
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/faqs", tags=["FAQs"])


@router.get("", response_model=List[FAQRead])
def list_faqs(
    department_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve FAQs with optional filtering by department, category, or search term."""
    query = db.query(FAQ)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(FAQ.is_published == True)

    if department_id:
        query = query.filter(FAQ.department_id == department_id)
    if category_id:
        query = query.filter(FAQ.category_id == category_id)
    if search:
        query = query.filter(
            (FAQ.question.ilike(f"%{search}%")) | (FAQ.answer.ilike(f"%{search}%"))
        )

    return query.order_by(FAQ.created_at.desc()).all()


@router.post("", response_model=FAQRead, status_code=status.HTTP_201_CREATED)
def create_faq(
    faq_in: FAQCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Create a new FAQ entry (Admin only)."""
    faq = FAQ(
        question=faq_in.question,
        answer=faq_in.answer,
        department_id=faq_in.department_id,
        category_id=faq_in.category_id,
        is_published=faq_in.is_published,
        created_by=admin.id,
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


@router.get("/{faq_id}", response_model=FAQRead)
def get_faq(
    faq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single FAQ by ID."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")
    if not faq.is_published and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")
    return faq


@router.put("/{faq_id}", response_model=FAQRead)
def update_faq(
    faq_id: str,
    faq_in: FAQUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Update FAQ (Admin only)."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")

    update_data = faq_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(faq, key, val)

    db.commit()
    db.refresh(faq)
    return faq


@router.delete("/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faq(
    faq_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Delete FAQ (Admin only)."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")

    db.delete(faq)
    db.commit()
    return None

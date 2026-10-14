from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.faq import FAQ, FAQVote
from app.models.department import Department
from app.models.category import Category
from app.schemas.faq import FAQCreate, FAQUpdate, FAQRead
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/faqs", tags=["FAQs"])


def _to_faq_read(faq: FAQ, is_voted: bool = False) -> FAQRead:
    dept_name = faq.department.name if faq.department else None
    cat_name = faq.category.name if faq.category else None
    return FAQRead(
        id=faq.id,
        department_id=faq.department_id,
        category_id=faq.category_id,
        department_name=dept_name,
        category_name=cat_name,
        question=faq.question,
        answer=faq.answer,
        is_published=faq.is_published,
        helpful_count=faq.helpful_count or 0,
        views=faq.views or 0,
        is_voted=is_voted,
        created_by=faq.created_by,
        created_at=faq.created_at,
        updated_at=faq.updated_at,
    )


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
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (FAQ.question.ilike(search_term)) | (FAQ.answer.ilike(search_term))
        )

    faqs = query.order_by(FAQ.created_at.desc()).all()

    user_votes = set()
    if current_user:
        votes = db.query(FAQVote.faq_id).filter(FAQVote.user_id == current_user.id).all()
        user_votes = {v[0] for v in votes}

    return [_to_faq_read(f, is_voted=(f.id in user_votes)) for f in faqs]


@router.post("", response_model=FAQRead, status_code=status.HTTP_201_CREATED)
def create_faq(
    faq_in: FAQCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Create a new FAQ entry (Admin only)."""
    dept_id = faq_in.department_id
    cat_id = faq_in.category_id

    if not dept_id and faq_in.department_name:
        dept = db.query(Department).filter(Department.name.ilike(faq_in.department_name.strip())).first()
        if dept:
            dept_id = dept.id

    if not cat_id and faq_in.category_name:
        cat = db.query(Category).filter(Category.name.ilike(faq_in.category_name.strip())).first()
        if cat:
            cat_id = cat.id

    faq = FAQ(
        question=faq_in.question.strip(),
        answer=faq_in.answer.strip(),
        department_id=dept_id,
        category_id=cat_id,
        is_published=faq_in.is_published,
        helpful_count=0,
        views=0,
        created_by=admin.id,
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return _to_faq_read(faq, is_voted=False)


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

    is_voted = False
    if current_user:
        vote = db.query(FAQVote).filter(FAQVote.faq_id == faq.id, FAQVote.user_id == current_user.id).first()
        is_voted = vote is not None

    return _to_faq_read(faq, is_voted=is_voted)


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

    if faq_in.question is not None:
        faq.question = faq_in.question.strip()
    if faq_in.answer is not None:
        faq.answer = faq_in.answer.strip()
    if faq_in.department_id is not None:
        faq.department_id = faq_in.department_id
    elif faq_in.department_name:
        dept = db.query(Department).filter(Department.name.ilike(faq_in.department_name.strip())).first()
        if dept:
            faq.department_id = dept.id
    if faq_in.category_id is not None:
        faq.category_id = faq_in.category_id
    elif faq_in.category_name:
        cat = db.query(Category).filter(Category.name.ilike(faq_in.category_name.strip())).first()
        if cat:
            faq.category_id = cat.id
    if faq_in.is_published is not None:
        faq.is_published = faq_in.is_published

    db.commit()
    db.refresh(faq)
    return _to_faq_read(faq)


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


@router.post("/{faq_id}/upvote")
def upvote_faq(
    faq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle upvote for an FAQ article. Persisted per user in database."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")

    existing_vote = db.query(FAQVote).filter(
        FAQVote.faq_id == faq_id,
        FAQVote.user_id == current_user.id,
    ).first()

    if existing_vote:
        db.delete(existing_vote)
        faq.helpful_count = max(0, (faq.helpful_count or 0) - 1)
        is_voted = False
    else:
        new_vote = FAQVote(faq_id=faq_id, user_id=current_user.id)
        db.add(new_vote)
        faq.helpful_count = (faq.helpful_count or 0) + 1
        is_voted = True

    db.commit()
    db.refresh(faq)
    return {
        "faq_id": faq.id,
        "helpful_count": faq.helpful_count,
        "is_voted": is_voted,
        "detail": "Vote updated successfully",
    }


@router.post("/{faq_id}/view")
def increment_faq_view(
    faq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Increment view counter for an FAQ article."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")

    faq.views = (faq.views or 0) + 1
    db.commit()
    db.refresh(faq)
    return {"faq_id": faq.id, "views": faq.views}

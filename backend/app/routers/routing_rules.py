from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.subcategory import Subcategory
from app.models.routing_rule import RoutingRule
from app.schemas.routing_rule import RoutingRuleCreate, RoutingRuleUpdate, RoutingRuleRead
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/routing-rules", tags=["Routing Rules"])


@router.get("", response_model=List[RoutingRuleRead])
def list_routing_rules(
    category_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all routing rules."""
    query = db.query(RoutingRule).filter(RoutingRule.is_active == True)
    if category_id:
        query = query.filter(RoutingRule.category_id == category_id)
    if department_id:
        query = query.filter(RoutingRule.department_id == department_id)
    return query.order_by(RoutingRule.updated_at.desc()).all()


@router.post("", response_model=RoutingRuleRead, status_code=status.HTTP_201_CREATED)
def create_routing_rule(
    rule_in: RoutingRuleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Create or update a routing rule (Admin only)."""
    # Sanitize string IDs (empty string -> None)
    cat_id = rule_in.category_id.strip() if rule_in.category_id and rule_in.category_id.strip() else None
    sub_id = rule_in.subcategory_id.strip() if rule_in.subcategory_id and rule_in.subcategory_id.strip() else None
    dept_id = rule_in.department_id.strip() if rule_in.department_id and rule_in.department_id.strip() else None
    team_id = rule_in.support_team_id.strip() if rule_in.support_team_id and rule_in.support_team_id.strip() else None
    user_id = rule_in.assigned_user_id.strip() if rule_in.assigned_user_id and rule_in.assigned_user_id.strip() else None

    # If subcategory provided, validate and backfill category_id and department_id
    if sub_id:
        sub = db.query(Subcategory).filter(Subcategory.id == sub_id).first()
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Subcategory '{sub_id}' not found")
        cat_id = sub.category_id
        if not dept_id and sub.category:
            dept_id = sub.category.department_id

    # If category provided, validate and backfill department_id
    if cat_id and not dept_id:
        cat = db.query(Category).filter(Category.id == cat_id).first()
        if cat:
            dept_id = cat.department_id

    # Validate assigned user exists if given
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Assigned employee '{user_id}' not found")

    # Upsert: check if an active rule for this specific taxonomy target already exists
    existing = None
    if sub_id:
        existing = db.query(RoutingRule).filter(
            RoutingRule.subcategory_id == sub_id
        ).first()
    elif cat_id:
        existing = db.query(RoutingRule).filter(
            RoutingRule.category_id == cat_id,
            (RoutingRule.subcategory_id.is_(None)) | (RoutingRule.subcategory_id == "")
        ).first()

    if existing:
        existing.assigned_user_id = user_id
        existing.department_id = dept_id
        existing.category_id = cat_id
        existing.subcategory_id = sub_id
        existing.support_team_id = team_id
        if rule_in.default_priority:
            existing.default_priority = rule_in.default_priority
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing

    rule = RoutingRule(
        category_id=cat_id,
        subcategory_id=sub_id,
        department_id=dept_id,
        support_team_id=team_id,
        assigned_user_id=user_id,
        default_priority=rule_in.default_priority or "MEDIUM",
        is_active=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/{rule_id}", response_model=RoutingRuleRead)
def get_routing_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single routing rule by ID."""
    rule = db.query(RoutingRule).filter(RoutingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routing rule not found")
    return rule


@router.put("/{rule_id}", response_model=RoutingRuleRead)
def update_routing_rule(
    rule_id: str,
    rule_in: RoutingRuleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Update routing rule (Admin only)."""
    rule = db.query(RoutingRule).filter(RoutingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routing rule not found")

    update_data = rule_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        if isinstance(val, str) and not val.strip() and key in ("department_id", "category_id", "subcategory_id", "support_team_id", "assigned_user_id"):
            val = None
        setattr(rule, key, val)

    # Re-verify and auto-fill relationships
    if rule.subcategory_id:
        sub = db.query(Subcategory).filter(Subcategory.id == rule.subcategory_id).first()
        if sub:
            rule.category_id = sub.category_id
            if sub.category and not rule.department_id:
                rule.department_id = sub.category.department_id
    elif rule.category_id and not rule.department_id:
        cat = db.query(Category).filter(Category.id == rule.category_id).first()
        if cat:
            rule.department_id = cat.department_id

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routing_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Soft delete routing rule (Admin only)."""
    rule = db.query(RoutingRule).filter(RoutingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routing rule not found")

    rule.is_active = False
    db.commit()
    return None

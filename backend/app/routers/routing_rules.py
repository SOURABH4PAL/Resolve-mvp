from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
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
    return query.all()


@router.post("", response_model=RoutingRuleRead, status_code=status.HTTP_201_CREATED)
def create_routing_rule(
    rule_in: RoutingRuleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Create a new routing rule (Admin only)."""
    rule = RoutingRule(
        category_id=rule_in.category_id,
        subcategory_id=rule_in.subcategory_id,
        department_id=rule_in.department_id,
        support_team_id=rule_in.support_team_id,
        assigned_user_id=rule_in.assigned_user_id,
        default_priority=rule_in.default_priority,
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
        setattr(rule, key, val)

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

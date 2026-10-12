from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RoutingRuleCreate(BaseModel):
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    department_id: Optional[str] = None
    support_team_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    default_priority: str = "MEDIUM"


class RoutingRuleUpdate(BaseModel):
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    department_id: Optional[str] = None
    support_team_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    default_priority: Optional[str] = None
    is_active: Optional[bool] = None


class RoutingRuleRead(BaseModel):
    id: str
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    department_id: Optional[str] = None
    support_team_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    default_priority: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

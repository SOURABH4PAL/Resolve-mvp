from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.ticket import TicketPriority, TicketStatus
from app.schemas.user import UserRead
from app.schemas.category import CategoryRead
from app.schemas.subcategory import SubcategoryRead


class TicketCreate(BaseModel):
    title: str
    description: str
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    priority: TicketPriority = TicketPriority.MEDIUM

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Title is required and must not be blank")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Description is required and must not be blank")
        return v.strip()

    @field_validator("category_id")
    @classmethod
    def normalize_category_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.strip()
        if not v_clean or v_clean.upper() in ("ANY", "NOT_SPECIFIED", "NONE", "ALL"):
            return None
        return v_clean

    @field_validator("subcategory_id")
    @classmethod
    def normalize_subcategory_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.strip()
        if not v_clean or v_clean.upper() in ("ANY", "NOT_SPECIFIED", "NONE", "ALL"):
            return None
        return v_clean


class TicketAssign(BaseModel):
    assignee_id: str


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    comment: Optional[str] = None


class TicketResolve(BaseModel):
    resolution_notes: Optional[str] = None


class TicketBlock(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("A clear blocking reason is required")
        return v.strip()


class TicketUnblock(BaseModel):
    reason: Optional[str] = None


class TicketJourneyRead(BaseModel):
    id: str
    ticket_id: str
    actor_id: Optional[str] = None
    event_type: str
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime
    actor: Optional[UserRead] = None

    model_config = ConfigDict(from_attributes=True)


class TicketRead(BaseModel):
    id: str
    ticket_number: str
    title: str
    description: str
    created_by: str
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus
    is_blocked: bool = False
    blocked_reason: Optional[str] = None
    blocked_at: Optional[datetime] = None
    blocked_by_id: Optional[str] = None
    response_due_at: Optional[datetime] = None
    resolution_due_at: Optional[datetime] = None
    first_responded_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    sla_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    creator: Optional[UserRead] = None
    assignee: Optional[UserRead] = None
    blocked_by: Optional[UserRead] = None
    category: Optional[CategoryRead] = None
    subcategory: Optional[SubcategoryRead] = None

    model_config = ConfigDict(from_attributes=True)

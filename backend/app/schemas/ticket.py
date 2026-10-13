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
    category_id: str
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


class TicketAssign(BaseModel):
    assignee_id: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    assigned_to: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    comment: Optional[str] = None


class TicketResolve(BaseModel):
    resolution_notes: Optional[str] = None


class TicketRead(BaseModel):
    id: str
    ticket_number: str
    title: str
    description: str
    created_by: str
    category_id: str
    subcategory_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus
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
    category: Optional[CategoryRead] = None
    subcategory: Optional[SubcategoryRead] = None

    model_config = ConfigDict(from_attributes=True)

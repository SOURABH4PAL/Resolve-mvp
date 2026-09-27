from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
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
    priority: TicketPriority
    status: TicketStatus
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    creator: Optional[UserRead] = None
    assignee: Optional[UserRead] = None
    category: Optional[CategoryRead] = None
    subcategory: Optional[SubcategoryRead] = None

    model_config = ConfigDict(from_attributes=True)

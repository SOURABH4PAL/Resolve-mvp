from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserRead


class TicketCommentCreate(BaseModel):
    content: str
    is_internal: bool = False


class TicketCommentRead(BaseModel):
    id: str
    ticket_id: str
    user_id: str
    content: str
    is_internal: bool
    created_at: datetime
    updated_at: datetime
    user: Optional[UserRead] = None

    model_config = ConfigDict(from_attributes=True)

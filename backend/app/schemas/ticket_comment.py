from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.schemas.user import UserRead


class TicketCommentCreate(BaseModel):
    content: str
    is_internal: bool = False

    @field_validator("content")
    @classmethod
    def content_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Comment content is required and must not be blank")
        return v.strip()


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

"""
Schemas for Notifications (Requirement 10).
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    ticket_id: Optional[str] = None
    title: str
    message: str
    is_read: bool = False


class NotificationCreate(NotificationBase):
    user_id: str


class NotificationRead(NotificationBase):
    id: str
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

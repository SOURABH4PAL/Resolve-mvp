"""
Schemas for Notifications.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    ticket_id: Optional[str] = None
    ticket_number: Optional[str] = None
    title: str
    message: str
    is_read: bool = False
    sender_email: Optional[str] = "system@resolvehub.com"
    recipient_email: Optional[str] = "user@resolvehub.com"
    delivery_status: Optional[str] = "Demo — Not Sent"
    is_demo: Optional[bool] = True


class NotificationCreate(NotificationBase):
    user_id: str


class NotificationRead(NotificationBase):
    id: str
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

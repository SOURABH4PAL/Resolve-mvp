from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    id: str
    user_id: str
    sender_email: str
    recipient_email: str
    ticket_id: Optional[str] = None
    ticket_number: Optional[str] = None
    title: str
    message: str
    delivery_status: str
    is_demo: bool
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

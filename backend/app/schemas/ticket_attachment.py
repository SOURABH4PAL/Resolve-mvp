from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserRead


class TicketAttachmentRead(BaseModel):
    id: str
    ticket_id: str
    uploaded_by: str
    file_name: str
    file_path: str
    file_size: int
    mime_type: Optional[str] = None
    created_at: datetime
    uploader: Optional[UserRead] = None

    model_config = ConfigDict(from_attributes=True)

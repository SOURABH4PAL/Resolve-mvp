from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.ticket_escalation import EscalationStatus


class TicketEscalationCreate(BaseModel):
    reason: str
    escalation_type: Optional[str] = "USER_HIGHLIGHT"

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Reason is required and must not be blank")
        return v.strip()


class TicketEscalationRead(BaseModel):
    id: str
    ticket_id: str
    escalation_type: str
    raised_by: str
    reason: str
    status: EscalationStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

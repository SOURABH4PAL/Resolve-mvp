from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class SlaPolicyCreate(BaseModel):
    name: str
    first_response_hours: int = 4
    resolution_hours: int = 24
    priority: Optional[str] = "MEDIUM"

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name is required and must not be blank")
        return v.strip()


class SlaPolicyUpdate(BaseModel):
    name: Optional[str] = None
    first_response_hours: Optional[int] = None
    resolution_hours: Optional[int] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None


class SlaPolicyRead(BaseModel):
    id: str
    name: str
    first_response_hours: int
    resolution_hours: int
    priority: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

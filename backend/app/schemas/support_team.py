from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class SupportTeamCreate(BaseModel):
    name: str
    department_id: str

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name is required and must not be blank")
        return v.strip()


class SupportTeamUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class SupportTeamRead(BaseModel):
    id: str
    name: str
    department_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

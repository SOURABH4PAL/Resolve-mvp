from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DepartmentBase(BaseModel):
    name: str
    department_email: Optional[str] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentRead(DepartmentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

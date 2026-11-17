from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    employee_id: str
    name: str
    email: str
    role: UserRole = UserRole.EMPLOYEE
    department_id: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserStatusUpdate(BaseModel):
    is_active: bool


class BulkAssignDepartmentRequest(BaseModel):
    user_ids: List[str]
    department_id: str


class BulkAssignDepartmentResponse(BaseModel):
    department_id: str
    department_name: str
    updated_count: int
    failed_count: int
    successful_user_ids: List[str]
    failed_user_ids: List[str]


class UserRead(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

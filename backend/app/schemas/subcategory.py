from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SubcategoryBase(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class SubcategoryCreate(SubcategoryBase):
    pass


class SubcategoryRead(SubcategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

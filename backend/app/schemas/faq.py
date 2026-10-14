from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class FAQCreate(BaseModel):
    question: str
    answer: str
    department_id: Optional[str] = None
    category_id: Optional[str] = None
    department_name: Optional[str] = None
    category_name: Optional[str] = None
    is_published: bool = True

    @field_validator("question")
    @classmethod
    def question_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Question is required and must not be blank")
        return v.strip()

    @field_validator("answer")
    @classmethod
    def answer_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Answer is required and must not be blank")
        return v.strip()


class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    department_id: Optional[str] = None
    category_id: Optional[str] = None
    department_name: Optional[str] = None
    category_name: Optional[str] = None
    is_published: Optional[bool] = None


class FAQRead(BaseModel):
    id: str
    department_id: Optional[str] = None
    category_id: Optional[str] = None
    department_name: Optional[str] = None
    category_name: Optional[str] = None
    question: str
    answer: str
    is_published: bool
    helpful_count: int = 0
    views: int = 0
    is_voted: bool = False
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

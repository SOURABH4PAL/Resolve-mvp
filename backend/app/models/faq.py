import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=True)
    question = Column(String(500), nullable=False)
    answer = Column(Text, nullable=False)
    is_published = Column(Boolean, default=True, nullable=False)
    helpful_count = Column(Integer, default=0, nullable=False)
    views = Column(Integer, default=0, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department")
    category = relationship("Category")
    author = relationship("User", foreign_keys=[created_by])
    votes = relationship("FAQVote", back_populates="faq", cascade="all, delete-orphan")


class FAQVote(Base):
    __tablename__ = "faq_votes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    faq_id = Column(String(36), ForeignKey("faqs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    faq = relationship("FAQ", back_populates="votes")
    user = relationship("User")

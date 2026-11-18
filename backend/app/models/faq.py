import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


_faq_views: dict[str, int] = {}


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=True)
    question = Column(String(500), nullable=False)
    answer = Column(Text, nullable=False)
    is_published = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department")
    category = relationship("Category")
    author = relationship("User", foreign_keys=[created_by])
    votes = relationship("FAQVote", back_populates="faq", cascade="all, delete-orphan", lazy="selectin")

    @property
    def helpful_count(self) -> int:
        return len(self.votes) if self.votes else 0

    @property
    def views(self) -> int:
        return _faq_views.get(self.id, 0)

    @views.setter
    def views(self, count: int) -> None:
        _faq_views[self.id] = count



class FAQVote(Base):
    __tablename__ = "faq_votes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    faq_id = Column(String(36), ForeignKey("faqs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    faq = relationship("FAQ", back_populates="votes")
    user = relationship("User")

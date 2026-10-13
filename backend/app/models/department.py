import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    department_email = Column(String(255), nullable=True)
    responsible_user_id = Column(
        String(36),
        ForeignKey("users.id", use_alter=True, name="fk_departments_responsible_user_id"),
        nullable=True
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    users = relationship("User", foreign_keys="User.department_id", back_populates="department")
    responsible_user = relationship("User", foreign_keys=[responsible_user_id])
    categories = relationship("Category", back_populates="department", cascade="all, delete-orphan")


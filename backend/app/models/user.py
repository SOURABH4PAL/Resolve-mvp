import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    SUPER_ADMIN = "SUPER_ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, native_enum=False), nullable=False, default=UserRole.EMPLOYEE)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department", foreign_keys=[department_id], back_populates="users")
    created_tickets = relationship("Ticket", foreign_keys="Ticket.created_by", back_populates="creator")
    assigned_tickets = relationship("Ticket", foreign_keys="Ticket.assigned_to", back_populates="assignee")
    comments = relationship("TicketComment", back_populates="user")
    attachments = relationship("TicketAttachment", back_populates="uploader")

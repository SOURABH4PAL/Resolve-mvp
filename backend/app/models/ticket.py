import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base


class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_USER = "WAITING_FOR_USER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id = Column(String(36), ForeignKey("subcategories.id"), nullable=True, index=True)
    assigned_team_id = Column(String(36), nullable=True)  # reserved for team assignments
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    priority = Column(SQLEnum(TicketPriority, native_enum=False), default=TicketPriority.MEDIUM, nullable=False, index=True)
    status = Column(SQLEnum(TicketStatus, native_enum=False), default=TicketStatus.OPEN, nullable=False, index=True)
    is_blocked = Column(Boolean, default=False, nullable=False, index=True)
    blocked_reason = Column(Text, nullable=True)
    blocked_at = Column(DateTime, nullable=True)
    blocked_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    sla_policy_id = Column(String(36), nullable=True)
    response_due_at = Column(DateTime, nullable=True)
    resolution_due_at = Column(DateTime, nullable=True)
    first_responded_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User", foreign_keys=[created_by], back_populates="created_tickets")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tickets")
    blocked_by = relationship("User", foreign_keys=[blocked_by_id])
    category = relationship("Category", back_populates="tickets")
    subcategory = relationship("Subcategory", back_populates="tickets")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
    journey_events = relationship(
        "TicketJourney",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketJourney.created_at.asc()",
    )

    @property
    def sla_status(self) -> str:
        if not self.resolution_due_at:
            return "NO_SLA"
        now = datetime.utcnow()
        if self.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
            if self.resolved_at and self.resolution_due_at:
                return "IN_SLA" if self.resolved_at <= self.resolution_due_at else "BREACHED"
            return "IN_SLA"
        if self.resolution_due_at and now > self.resolution_due_at:
            return "BREACHED"
        if self.response_due_at and self.first_responded_at is None and now > self.response_due_at:
            return "BREACHED"
        if self.resolution_due_at and self.created_at:
            total_duration = (self.resolution_due_at - self.created_at).total_seconds()
            remaining = (self.resolution_due_at - now).total_seconds()
            if total_duration > 0 and remaining <= 0.25 * total_duration:
                return "AT_RISK"
        return "IN_SLA"

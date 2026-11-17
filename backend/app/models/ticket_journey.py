import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TicketJourney(Base):
    __tablename__ = "ticket_journey"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    event_type = Column(String(50), nullable=False)  # CREATED, ASSIGNED, REASSIGNED, STATUS_CHANGED, BLOCKED, UNBLOCKED, RESOLVED, CLOSED, COMMENT_ADDED, ATTACHMENT_ADDED
    description = Column(Text, nullable=False)
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    ticket = relationship("Ticket", back_populates="journey_events")
    actor = relationship("User", foreign_keys=[actor_id])

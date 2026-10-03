import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_email = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    ticket_id = Column(String(36), ForeignKey("tickets.id"), nullable=True)
    ticket_number = Column(String(50), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    delivery_status = Column(String(50), default="Demo — Not Sent", nullable=False)
    is_demo = Column(Boolean, default=True, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    ticket = relationship("Ticket", foreign_keys=[ticket_id])

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from app.database import Base


class SlaPolicy(Base):
    __tablename__ = "sla_policies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    first_response_hours = Column(Integer, nullable=False, default=4)
    resolution_hours = Column(Integer, nullable=False, default=24)
    priority = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

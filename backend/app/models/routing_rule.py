import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class RoutingRule(Base):
    __tablename__ = "routing_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=True)
    subcategory_id = Column(String(36), ForeignKey("subcategories.id"), nullable=True)
    support_team_id = Column(String(36), ForeignKey("support_teams.id"), nullable=True)
    assigned_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    default_priority = Column(String(20), default="MEDIUM", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department")
    category = relationship("Category")
    subcategory = relationship("Subcategory")
    support_team = relationship("SupportTeam")
    assigned_user = relationship("User")

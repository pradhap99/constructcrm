import uuid
from datetime import datetime, timezone, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ChangeOrderStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    implemented = "implemented"
    cancelled = "cancelled"


class ChangeOrderType(str, enum.Enum):
    addition = "addition"
    deletion = "deletion"
    modification = "modification"
    substitution = "substitution"


class ChangeOrder(Base):
    __tablename__ = "change_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    co_number = Column(String, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    co_type = Column(Enum(ChangeOrderType, name="changeordertype"), default=ChangeOrderType.addition)
    status = Column(Enum(ChangeOrderStatus, name="changeorderstatus"), default=ChangeOrderStatus.draft)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    items = Column(JSON, default=list)
    cost_impact = Column(Numeric(15, 2), default=0)
    time_impact_days = Column(Numeric(8, 1), default=0)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    documents = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=lambda: datetime.now(timezone.utc))

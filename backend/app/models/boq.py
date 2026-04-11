import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class BOQStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    revised = "revised"
    approved = "approved"
    closed = "closed"


class BOQ(Base):
    __tablename__ = "boqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    boq_number = Column(String, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    status = Column(Enum(BOQStatus, name="boqstatus"), default=BOQStatus.draft)
    revision = Column(Integer, default=1)
    items = Column(JSON, default=list)
    total_amount = Column(Numeric(15, 2), default=0)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

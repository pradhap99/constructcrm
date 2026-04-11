from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class RFQStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    responses_received = "responses_received"
    comparative_created = "comparative_created"
    closed = "closed"
    cancelled = "cancelled"


class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_number = Column(String, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    indent_id = Column(UUID(as_uuid=True), ForeignKey("indents.id"), nullable=True)
    status = Column(Enum(RFQStatus, name="rfqstatus"), default=RFQStatus.draft)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    terms_and_conditions = Column(Text, nullable=True)
    items = Column(JSON, default=list)
    vendor_ids = Column(JSON, default=list)
    responses = Column(JSON, default=list)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

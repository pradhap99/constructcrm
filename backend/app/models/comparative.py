import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ComparativeStatus(str, enum.Enum):
    draft = "draft"
    under_review = "under_review"
    approved = "approved"
    po_issued = "po_issued"


class Comparative(Base):
    __tablename__ = "comparatives"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comparative_number = Column(String, unique=True, nullable=False)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    status = Column(Enum(ComparativeStatus, name="comparativestatus"), default=ComparativeStatus.draft)
    title = Column(String, nullable=False)
    items = Column(JSON, default=list)
    vendor_quotes = Column(JSON, default=list)
    recommended_vendor_id = Column(UUID(as_uuid=True), nullable=True)
    recommendation_notes = Column(Text, nullable=True)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

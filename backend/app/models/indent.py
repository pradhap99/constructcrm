from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class IndentStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    rfq_created = "rfq_created"
    po_created = "po_created"
    closed = "closed"


class UnitOfMeasure(str, enum.Enum):
    nos = "nos"
    kg = "kg"
    ton = "ton"
    sqft = "sqft"
    sqm = "sqm"
    rft = "rft"
    cum = "cum"
    liter = "liter"
    bag = "bag"
    bundle = "bundle"
    set = "set"
    pair = "pair"


class Indent(Base):
    __tablename__ = "indents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indent_number = Column(String, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    status = Column(Enum(IndentStatus, name="indentstatus"), default=IndentStatus.draft)
    required_date = Column(DateTime, nullable=True)
    priority = Column(String, default="normal")
    site_location = Column(String, nullable=True)
    purpose = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

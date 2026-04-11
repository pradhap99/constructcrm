import uuid
from datetime import datetime, timezone, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class POStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    sent = "sent"
    acknowledged = "acknowledged"
    partially_delivered = "partially_delivered"
    delivered = "delivered"
    invoiced = "invoiced"
    closed = "closed"
    cancelled = "cancelled"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number = Column(String, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    comparative_id = Column(UUID(as_uuid=True), ForeignKey("comparatives.id"), nullable=True)
    status = Column(Enum(POStatus, name="postatus"), default=POStatus.draft)
    title = Column(String, nullable=False)
    delivery_address = Column(Text, nullable=True)
    delivery_date = Column(Date, nullable=True)
    payment_terms = Column(String, nullable=True)
    items = Column(JSON, default=list)
    subtotal = Column(Numeric(15, 2), default=0)
    gst_amount = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), default=0)
    currency = Column(String, default="INR")
    terms_and_conditions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=lambda: datetime.now(timezone.utc))

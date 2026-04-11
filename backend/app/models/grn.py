import uuid
from datetime import datetime, timezone, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class GRNStatus(str, enum.Enum):
    draft = "draft"
    pending_inspection = "pending_inspection"
    inspected = "inspected"
    accepted = "accepted"
    partially_rejected = "partially_rejected"
    rejected = "rejected"
    closed = "closed"


class GRN(Base):
    __tablename__ = "grns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_number = Column(String, unique=True, nullable=False)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    status = Column(Enum(GRNStatus, name="grnstatus"), default=GRNStatus.draft)
    delivery_challan_no = Column(String, nullable=True)
    vehicle_number = Column(String, nullable=True)
    received_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    received_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    inspection_date = Column(DateTime, nullable=True)
    inspected_by = Column(UUID(as_uuid=True), nullable=True)
    items = Column(JSON, default=list)
    remarks = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    documents = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=lambda: datetime.now(timezone.utc))

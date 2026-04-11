import uuid
from datetime import datetime, timezone, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean, Date, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class BillingStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    certified = "certified"
    approved = "approved"
    paid = "paid"
    partially_paid = "partially_paid"
    disputed = "disputed"


class BillingType(str, enum.Enum):
    running_account = "running_account"
    milestone = "milestone"
    final = "final"
    advance = "advance"
    retention = "retention"


class Billing(Base):
    __tablename__ = "billings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    billing_number = Column(String, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    billing_type = Column(Enum(BillingType, name="billingtype"), default=BillingType.running_account)
    status = Column(Enum(BillingStatus, name="billingstatus"), default=BillingStatus.draft)
    billing_period_start = Column(Date, nullable=True)
    billing_period_end = Column(Date, nullable=True)
    bill_number = Column(Integer, nullable=True)
    items = Column(JSON, default=list)
    gross_amount = Column(Numeric(15, 2), default=0)
    deductions = Column(JSON, default=list)
    retention_percentage = Column(Numeric(5, 2), default=5)
    retention_amount = Column(Numeric(15, 2), default=0)
    net_amount = Column(Numeric(15, 2), default=0)
    gst_amount = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), default=0)
    paid_amount = Column(Numeric(15, 2), default=0)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    certified_by = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(Text, nullable=True)
    documents = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=lambda: datetime.now(timezone.utc))

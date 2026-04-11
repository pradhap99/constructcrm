from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    approved = "approved"
    partially_paid = "partially_paid"
    paid = "paid"
    disputed = "disputed"
    cancelled = "cancelled"


class InvoiceType(str, enum.Enum):
    vendor = "vendor"
    client = "client"
    proforma = "proforma"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String, unique=True, nullable=False)
    invoice_type = Column(Enum(InvoiceType, name="invoicetype"), default=InvoiceType.vendor)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=True)
    grn_id = Column(UUID(as_uuid=True), ForeignKey("grns.id"), nullable=True)
    status = Column(Enum(InvoiceStatus, name="invoicestatus"), default=InvoiceStatus.draft)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    vendor_invoice_number = Column(String, nullable=True)
    items = Column(JSON, default=list)
    subtotal = Column(Numeric(15, 2), default=0)
    cgst_amount = Column(Numeric(15, 2), default=0)
    sgst_amount = Column(Numeric(15, 2), default=0)
    igst_amount = Column(Numeric(15, 2), default=0)
    total_gst = Column(Numeric(15, 2), default=0)
    tds_amount = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), default=0)
    paid_amount = Column(Numeric(15, 2), default=0)
    balance_amount = Column(Numeric(15, 2), default=0)
    currency = Column(String, default="INR")
    payment_mode = Column(String, nullable=True)
    payment_date = Column(Date, nullable=True)
    payment_reference = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    documents = Column(JSON, default=list)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

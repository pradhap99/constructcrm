from typing import Optional, List, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.schemas._base import ResponseBase
from app.models.invoice import InvoiceStatus, InvoiceType


class InvoiceCreate(BaseModel):
    invoice_number: str
    invoice_type: InvoiceType = InvoiceType.vendor
    project_id: str
    created_by: str
    vendor_id: Optional[str] = None
    po_id: Optional[str] = None
    grn_id: Optional[str] = None
    status: InvoiceStatus = InvoiceStatus.draft
    invoice_date: date
    due_date: Optional[date] = None
    vendor_invoice_number: Optional[str] = None
    items: List[Any] = []
    subtotal: Decimal = Decimal("0")
    cgst_amount: Decimal = Decimal("0")
    sgst_amount: Decimal = Decimal("0")
    igst_amount: Decimal = Decimal("0")
    total_gst: Decimal = Decimal("0")
    tds_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    paid_amount: Decimal = Decimal("0")
    balance_amount: Decimal = Decimal("0")
    currency: str = "INR"
    payment_mode: Optional[str] = None
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    documents: List[Any] = []


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    due_date: Optional[date] = None
    vendor_invoice_number: Optional[str] = None
    items: Optional[List[Any]] = None
    subtotal: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    total_gst: Optional[Decimal] = None
    tds_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    balance_amount: Optional[Decimal] = None
    payment_mode: Optional[str] = None
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[Any]] = None


class InvoiceResponse(ResponseBase):

    id: str
    invoice_number: str
    invoice_type: InvoiceType
    project_id: str
    created_by: str
    vendor_id: Optional[str] = None
    po_id: Optional[str] = None
    grn_id: Optional[str] = None
    status: InvoiceStatus
    invoice_date: date
    due_date: Optional[date] = None
    vendor_invoice_number: Optional[str] = None
    items: List[Any] = []
    subtotal: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_gst: Decimal
    tds_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    currency: str
    payment_mode: Optional[str] = None
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    documents: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

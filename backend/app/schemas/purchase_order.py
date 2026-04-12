from typing import Optional, List, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.models.purchase_order import POStatus


class PurchaseOrderCreate(BaseModel):
    po_number: str
    project_id: str
    vendor_id: str
    created_by: str
    comparative_id: Optional[str] = None
    status: POStatus = POStatus.draft
    title: str
    delivery_address: Optional[str] = None
    delivery_date: Optional[date] = None
    payment_terms: Optional[str] = None
    items: List[Any] = []
    subtotal: Decimal = Decimal("0")
    gst_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    currency: str = "INR"
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderUpdate(BaseModel):
    status: Optional[POStatus] = None
    title: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_date: Optional[date] = None
    payment_terms: Optional[str] = None
    items: Optional[List[Any]] = None
    subtotal: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    approved_by: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    po_number: str
    project_id: str
    vendor_id: str
    created_by: str
    comparative_id: Optional[str] = None
    status: POStatus
    title: str
    delivery_address: Optional[str] = None
    delivery_date: Optional[date] = None
    payment_terms: Optional[str] = None
    items: List[Any] = []
    subtotal: Decimal
    gst_amount: Decimal
    total_amount: Decimal
    currency: str
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

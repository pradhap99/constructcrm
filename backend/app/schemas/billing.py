from typing import Optional, List, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.models.billing import BillingStatus, BillingType


class BillingCreate(BaseModel):
    billing_number: str
    project_id: str
    submitted_by: str
    billing_type: BillingType = BillingType.running_account
    status: BillingStatus = BillingStatus.draft
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    bill_number: Optional[int] = None
    items: List[Any] = []
    gross_amount: Decimal = Decimal("0")
    deductions: List[Any] = []
    retention_percentage: Decimal = Decimal("5")
    retention_amount: Decimal = Decimal("0")
    net_amount: Decimal = Decimal("0")
    gst_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    paid_amount: Decimal = Decimal("0")
    notes: Optional[str] = None
    documents: List[Any] = []


class BillingUpdate(BaseModel):
    billing_type: Optional[BillingType] = None
    status: Optional[BillingStatus] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    bill_number: Optional[int] = None
    items: Optional[List[Any]] = None
    gross_amount: Optional[Decimal] = None
    deductions: Optional[List[Any]] = None
    retention_percentage: Optional[Decimal] = None
    retention_amount: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    certified_by: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[Any]] = None


class BillingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    billing_number: str
    project_id: str
    submitted_by: str
    billing_type: BillingType
    status: BillingStatus
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    bill_number: Optional[int] = None
    items: List[Any] = []
    gross_amount: Decimal
    deductions: List[Any] = []
    retention_percentage: Decimal
    retention_amount: Decimal
    net_amount: Decimal
    gst_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    certified_by: Optional[str] = None
    notes: Optional[str] = None
    documents: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

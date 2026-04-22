from typing import Optional, List, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, model_validator
from app.schemas._base import ResponseBase
from app.models.billing import BillingStatus, BillingType


class DeductionBreakdown(BaseModel):
    """Structured deduction breakdown for RA / milestone bills."""
    security_deposit_pct: Decimal = Decimal("0")   # % of gross
    it_tds_pct: Decimal = Decimal("0")             # % of gross
    gst_tds_pct: Decimal = Decimal("0")            # % of gross
    ld_amount: Decimal = Decimal("0")              # ₹ fixed — Liquidated Damages
    labour_cess: Decimal = Decimal("0")            # ₹ fixed
    material_recovery: Decimal = Decimal("0")      # ₹ fixed
    # Computed fields (auto-filled by validator)
    security_deposit_amount: Decimal = Decimal("0")
    it_tds_amount: Decimal = Decimal("0")
    gst_tds_amount: Decimal = Decimal("0")
    total_deductions: Decimal = Decimal("0")

    @model_validator(mode="before")
    @classmethod
    def compute_amounts(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        gross = Decimal(str(values.get("gross_amount", 0)))
        sd  = Decimal(str(values.get("security_deposit_pct", 0))) / 100 * gross
        it  = Decimal(str(values.get("it_tds_pct", 0))) / 100 * gross
        gst = Decimal(str(values.get("gst_tds_pct", 0))) / 100 * gross
        ld  = Decimal(str(values.get("ld_amount", 0)))
        lc  = Decimal(str(values.get("labour_cess", 0)))
        mr  = Decimal(str(values.get("material_recovery", 0)))
        values["security_deposit_amount"] = sd
        values["it_tds_amount"] = it
        values["gst_tds_amount"] = gst
        values["total_deductions"] = sd + it + gst + ld + lc + mr
        return values


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
    deductions: Optional[DeductionBreakdown] = None
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
    deductions: Optional[DeductionBreakdown] = None
    retention_percentage: Optional[Decimal] = None
    retention_amount: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    certified_by: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[Any]] = None


class BillingResponse(ResponseBase):

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
    deductions: Optional[Any] = None          # stored as JSON dict in DB
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


from typing import List, Optional, Any
from decimal import Decimal
from datetime import date, datetime
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.user import User
from app.models.billing import Billing, BillingStatus, BillingType
from app.api.deps import get_current_user

router = APIRouter(prefix="/bills", tags=["bills"])


class BillResponse(BaseModel):
    """Billing record enriched with project_name."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    billing_number: str
    project_id: str
    project_name: Optional[str] = None
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
    submitted_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def _enrich(b: Billing) -> dict:
    data = {c.name: getattr(b, c.name) for c in b.__table__.columns}
    data["id"] = str(data["id"])
    data["project_id"] = str(data["project_id"])
    data["submitted_by"] = str(data["submitted_by"])
    data["certified_by"] = str(data["certified_by"]) if data["certified_by"] else None
    data["project_name"] = b.project.name if hasattr(b, "project") and b.project else None
    # submitted_date = billing_period_start as a proxy for submission date
    data["submitted_date"] = data.get("billing_period_start")
    return data


@router.get("/", response_model=List[BillResponse])
def list_bills(
    project_id: Optional[str] = None,
    status: Optional[BillingStatus] = None,
    billing_type: Optional[BillingType] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Billing)
    if project_id:
        q = q.filter(Billing.project_id == project_id)
    if status:
        q = q.filter(Billing.status == status)
    if billing_type:
        q = q.filter(Billing.billing_type == billing_type)
    q = q.order_by(Billing.created_at.desc())
    items = q.offset(skip).limit(limit).all()
    return [BillResponse(**_enrich(b)) for b in items]


@router.get("/{bill_id}", response_model=BillResponse)
def get_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException
    try:
        _bill_id = uuid.UUID(bill_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Not found")
    item = db.query(Billing).filter(Billing.id == _bill_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Bill not found")
    return BillResponse(**_enrich(item))

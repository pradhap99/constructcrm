from typing import Optional, List, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.change_order import ChangeOrderStatus, ChangeOrderType


class ChangeOrderCreate(BaseModel):
    co_number: str
    project_id: str
    submitted_by: str
    co_type: ChangeOrderType = ChangeOrderType.addition
    status: ChangeOrderStatus = ChangeOrderStatus.draft
    title: str
    description: Optional[str] = None
    reason: Optional[str] = None
    items: List[Any] = []
    cost_impact: Decimal = Decimal("0")
    time_impact_days: Decimal = Decimal("0")
    documents: List[Any] = []


class ChangeOrderUpdate(BaseModel):
    co_type: Optional[ChangeOrderType] = None
    status: Optional[ChangeOrderStatus] = None
    title: Optional[str] = None
    description: Optional[str] = None
    reason: Optional[str] = None
    items: Optional[List[Any]] = None
    cost_impact: Optional[Decimal] = None
    time_impact_days: Optional[Decimal] = None
    documents: Optional[List[Any]] = None
    approved_by: Optional[str] = None


class ChangeOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    co_number: str
    project_id: str
    submitted_by: str
    co_type: ChangeOrderType
    status: ChangeOrderStatus
    title: str
    description: Optional[str] = None
    reason: Optional[str] = None
    items: List[Any] = []
    cost_impact: Decimal
    time_impact_days: Decimal
    documents: List[Any] = []
    approved_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

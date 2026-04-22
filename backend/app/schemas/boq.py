from typing import Optional, List, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas._base import ResponseBase
from app.models.boq import BOQStatus


class BOQCreate(BaseModel):
    boq_number: str
    project_id: str
    created_by: str
    title: str
    status: BOQStatus = BOQStatus.draft
    revision: int = 1
    items: List[Any] = []
    total_amount: Decimal = Decimal("0")
    notes: Optional[str] = None


class BOQUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[BOQStatus] = None
    revision: Optional[int] = None
    items: Optional[List[Any]] = None
    total_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    approved_by: Optional[str] = None


class BOQResponse(ResponseBase):

    id: str
    boq_number: str
    project_id: str
    created_by: str
    title: str
    status: BOQStatus
    revision: int
    items: List[Any] = []
    total_amount: Decimal
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas._base import ResponseBase
from app.models.rfq import RFQStatus


class RFQCreate(BaseModel):
    rfq_number: str
    project_id: str
    indent_id: Optional[str] = None
    created_by: str
    status: RFQStatus = RFQStatus.draft
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    terms_and_conditions: Optional[str] = None
    items: List[Any] = []
    vendor_ids: List[Any] = []


class RFQUpdate(BaseModel):
    status: Optional[RFQStatus] = None
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    terms_and_conditions: Optional[str] = None
    items: Optional[List[Any]] = None
    vendor_ids: Optional[List[Any]] = None
    responses: Optional[List[Any]] = None


class RFQResponse(ResponseBase):

    id: str
    rfq_number: str
    project_id: str
    indent_id: Optional[str] = None
    created_by: str
    status: RFQStatus
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    terms_and_conditions: Optional[str] = None
    items: List[Any] = []
    vendor_ids: List[Any] = []
    responses: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

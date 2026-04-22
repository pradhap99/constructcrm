from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas._base import ResponseBase
from app.models.comparative import ComparativeStatus


class ComparativeCreate(BaseModel):
    comparative_number: str
    rfq_id: str
    project_id: str
    created_by: str
    status: ComparativeStatus = ComparativeStatus.draft
    title: str
    items: List[Any] = []
    vendor_quotes: List[Any] = []
    recommended_vendor_id: Optional[str] = None
    recommendation_notes: Optional[str] = None


class ComparativeUpdate(BaseModel):
    status: Optional[ComparativeStatus] = None
    title: Optional[str] = None
    items: Optional[List[Any]] = None
    vendor_quotes: Optional[List[Any]] = None
    recommended_vendor_id: Optional[str] = None
    recommendation_notes: Optional[str] = None
    approved_by: Optional[str] = None


class ComparativeResponse(ResponseBase):

    id: str
    comparative_number: str
    rfq_id: str
    project_id: str
    created_by: str
    status: ComparativeStatus
    title: str
    items: List[Any] = []
    vendor_quotes: List[Any] = []
    recommended_vendor_id: Optional[str] = None
    recommendation_notes: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

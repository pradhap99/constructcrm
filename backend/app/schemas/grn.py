from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.grn import GRNStatus


class GRNCreate(BaseModel):
    grn_number: str
    po_id: str
    project_id: str
    vendor_id: str
    received_by: str
    status: GRNStatus = GRNStatus.draft
    delivery_challan_no: Optional[str] = None
    vehicle_number: Optional[str] = None
    received_date: Optional[datetime] = None
    inspection_date: Optional[datetime] = None
    inspected_by: Optional[str] = None
    items: List[Any] = []
    remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    documents: List[Any] = []


class GRNUpdate(BaseModel):
    status: Optional[GRNStatus] = None
    delivery_challan_no: Optional[str] = None
    vehicle_number: Optional[str] = None
    inspection_date: Optional[datetime] = None
    inspected_by: Optional[str] = None
    items: Optional[List[Any]] = None
    remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    documents: Optional[List[Any]] = None


class GRNResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    grn_number: str
    po_id: str
    project_id: str
    vendor_id: str
    received_by: str
    status: GRNStatus
    delivery_challan_no: Optional[str] = None
    vehicle_number: Optional[str] = None
    received_date: Optional[datetime] = None
    inspection_date: Optional[datetime] = None
    inspected_by: Optional[str] = None
    items: List[Any] = []
    remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    documents: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

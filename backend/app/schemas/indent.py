from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.indent import IndentStatus, UnitOfMeasure


class IndentCreate(BaseModel):
    indent_number: str
    project_id: str
    requested_by: str
    status: IndentStatus = IndentStatus.draft
    required_date: Optional[datetime] = None
    priority: str = "normal"
    site_location: Optional[str] = None
    purpose: Optional[str] = None
    remarks: Optional[str] = None
    items: List[Any] = []


class IndentUpdate(BaseModel):
    status: Optional[IndentStatus] = None
    required_date: Optional[datetime] = None
    priority: Optional[str] = None
    site_location: Optional[str] = None
    purpose: Optional[str] = None
    remarks: Optional[str] = None
    items: Optional[List[Any]] = None
    approved_by: Optional[str] = None


class IndentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    indent_number: str
    project_id: str
    requested_by: str
    approved_by: Optional[str] = None
    status: IndentStatus
    required_date: Optional[datetime] = None
    priority: str
    site_location: Optional[str] = None
    purpose: Optional[str] = None
    remarks: Optional[str] = None
    items: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

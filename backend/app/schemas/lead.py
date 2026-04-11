from typing import Optional, List, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.lead import LeadStatus, LeadSource


class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    company: Optional[str] = None
    project_type: Optional[str] = None
    budget_range: Optional[str] = None
    location: Optional[str] = None
    status: LeadStatus = LeadStatus.new
    source: LeadSource = LeadSource.other
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    follow_up_date: Optional[datetime] = None
    tags: List[Any] = []


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    project_type: Optional[str] = None
    budget_range: Optional[str] = None
    location: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[LeadSource] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    follow_up_date: Optional[datetime] = None
    tags: Optional[List[Any]] = None


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: Optional[str] = None
    phone: str
    company: Optional[str] = None
    project_type: Optional[str] = None
    budget_range: Optional[str] = None
    location: Optional[str] = None
    status: LeadStatus
    source: LeadSource
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    follow_up_date: Optional[datetime] = None
    tags: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

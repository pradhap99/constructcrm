from typing import Optional, Any, Dict
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.schemas._base import ResponseBase
from app.models.project import ProjectStatus, ProjectType


class ProjectCreate(BaseModel):
    name: str
    project_code: str
    description: Optional[str] = None
    project_type: ProjectType = ProjectType.residential
    status: ProjectStatus = ProjectStatus.planning
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    site_address: str
    city: str
    state: str
    pincode: Optional[str] = None
    total_area_sqft: Optional[Decimal] = None
    budget_amount: Decimal = Decimal("0")
    contract_value: Optional[Decimal] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    project_manager_id: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_type: Optional[ProjectType] = None
    status: Optional[ProjectStatus] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    site_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    total_area_sqft: Optional[Decimal] = None
    budget_amount: Optional[Decimal] = None
    contract_value: Optional[Decimal] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    project_manager_id: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None


class ProjectResponse(ResponseBase):

    id: str
    name: str
    project_code: str
    description: Optional[str] = None
    project_type: ProjectType
    status: ProjectStatus
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    site_address: str
    city: str
    state: str
    pincode: Optional[str] = None
    total_area_sqft: Optional[Decimal] = None
    budget_amount: Decimal
    contract_value: Optional[Decimal] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    project_manager_id: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

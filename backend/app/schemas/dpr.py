from typing import Optional, List, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.models.dpr import DPRStatus, WeatherCondition


class DPRCreate(BaseModel):
    dpr_number: str
    project_id: str
    submitted_by: str
    report_date: date
    status: DPRStatus = DPRStatus.draft
    weather: WeatherCondition = WeatherCondition.sunny
    temperature_celsius: Optional[Decimal] = None
    work_done: List[Any] = []
    manpower: List[Any] = []
    equipment: List[Any] = []
    materials_used: List[Any] = []
    issues: Optional[str] = None
    safety_observations: Optional[str] = None
    visitors: List[Any] = []
    photos: List[Any] = []
    total_workers: int = 0
    remarks: Optional[str] = None


class DPRUpdate(BaseModel):
    status: Optional[DPRStatus] = None
    weather: Optional[WeatherCondition] = None
    temperature_celsius: Optional[Decimal] = None
    work_done: Optional[List[Any]] = None
    manpower: Optional[List[Any]] = None
    equipment: Optional[List[Any]] = None
    materials_used: Optional[List[Any]] = None
    issues: Optional[str] = None
    safety_observations: Optional[str] = None
    visitors: Optional[List[Any]] = None
    photos: Optional[List[Any]] = None
    total_workers: Optional[int] = None
    remarks: Optional[str] = None
    approved_by: Optional[str] = None


class DPRResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dpr_number: str
    project_id: str
    submitted_by: str
    report_date: date
    status: DPRStatus
    weather: WeatherCondition
    temperature_celsius: Optional[Decimal] = None
    work_done: List[Any] = []
    manpower: List[Any] = []
    equipment: List[Any] = []
    materials_used: List[Any] = []
    issues: Optional[str] = None
    safety_observations: Optional[str] = None
    visitors: List[Any] = []
    photos: List[Any] = []
    total_workers: int
    remarks: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

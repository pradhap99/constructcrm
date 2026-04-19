from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.material import MaterialStatus


class MaterialCreate(BaseModel):
    name: str
    project_id: str
    unit: str = "Nos"
    description: Optional[str] = None
    work_package: Optional[str] = None
    ordered_qty: Decimal = Decimal("0")
    received_qty: Decimal = Decimal("0")
    installed_qty: Decimal = Decimal("0")
    rate: Decimal = Decimal("0")
    status: MaterialStatus = MaterialStatus.pending


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    work_package: Optional[str] = None
    unit: Optional[str] = None
    ordered_qty: Optional[Decimal] = None
    received_qty: Optional[Decimal] = None
    installed_qty: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    status: Optional[MaterialStatus] = None


class MaterialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    project_id: str
    unit: str
    description: Optional[str] = None
    work_package: Optional[str] = None
    ordered_qty: Decimal
    received_qty: Decimal
    installed_qty: Decimal
    rate: Decimal
    status: MaterialStatus
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

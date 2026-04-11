from typing import Optional, List, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.vendor import VendorCategory, VendorStatus


class VendorCreate(BaseModel):
    name: str
    vendor_code: str
    category: VendorCategory = VendorCategory.material_supplier
    status: VendorStatus = VendorStatus.pending_approval
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    credit_limit: Decimal = Decimal("0")
    payment_terms_days: Optional[str] = None
    rating: Optional[Decimal] = None
    is_msme: bool = False
    specializations: List[Any] = []
    documents: List[Any] = []


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[VendorCategory] = None
    status: Optional[VendorStatus] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms_days: Optional[str] = None
    rating: Optional[Decimal] = None
    is_msme: Optional[bool] = None
    specializations: Optional[List[Any]] = None
    documents: Optional[List[Any]] = None


class VendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    vendor_code: str
    category: VendorCategory
    status: VendorStatus
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    credit_limit: Decimal
    payment_terms_days: Optional[str] = None
    rating: Optional[Decimal] = None
    is_msme: bool
    specializations: List[Any] = []
    documents: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

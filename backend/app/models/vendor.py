import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class VendorCategory(str, enum.Enum):
    material_supplier = "material_supplier"
    subcontractor = "subcontractor"
    equipment_rental = "equipment_rental"
    service_provider = "service_provider"
    consultant = "consultant"


class VendorStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    blacklisted = "blacklisted"
    pending_approval = "pending_approval"


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    vendor_code = Column(String, unique=True, nullable=False)
    category = Column(Enum(VendorCategory, name="vendorcategory"), default=VendorCategory.material_supplier)
    status = Column(Enum(VendorStatus, name="vendorstatus"), default=VendorStatus.pending_approval)
    contact_person = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    pan = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    bank_account_no = Column(String, nullable=True)
    bank_ifsc = Column(String, nullable=True)
    credit_limit = Column(Numeric(15, 2), default=0)
    payment_terms_days = Column(String, nullable=True)
    rating = Column(Numeric(3, 2), nullable=True)
    is_msme = Column(Boolean, default=False)
    specializations = Column(JSON, default=list)
    documents = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

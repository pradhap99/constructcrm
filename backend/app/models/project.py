import uuid
from datetime import datetime, timezone, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ProjectStatus(str, enum.Enum):
    planning = "planning"
    active = "active"
    on_hold = "on_hold"
    completed = "completed"
    cancelled = "cancelled"


class ProjectType(str, enum.Enum):
    residential = "residential"
    commercial = "commercial"
    industrial = "industrial"
    infrastructure = "infrastructure"
    renovation = "renovation"


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    project_code = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(Enum(ProjectType, name="projecttype"), default=ProjectType.residential)
    status = Column(Enum(ProjectStatus, name="projectstatus"), default=ProjectStatus.planning)
    client_name = Column(String, nullable=False)
    client_phone = Column(String, nullable=True)
    client_email = Column(String, nullable=True)
    site_address = Column(Text, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    pincode = Column(String, nullable=True)
    total_area_sqft = Column(Numeric(12, 2), nullable=True)
    budget_amount = Column(Numeric(15, 2), nullable=False, default=0)
    contract_value = Column(Numeric(15, 2), nullable=True)
    start_date = Column(Date, nullable=True)
    expected_end_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    project_manager_id = Column(UUID(as_uuid=True), nullable=True)
    gstin = Column(String, nullable=True)
    pan = Column(String, nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=lambda: datetime.now(timezone.utc))

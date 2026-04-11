import uuid
from datetime import datetime, date, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean, Date, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class DPRStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"


class WeatherCondition(str, enum.Enum):
    sunny = "sunny"
    cloudy = "cloudy"
    rainy = "rainy"
    stormy = "stormy"
    foggy = "foggy"


class DPR(Base):
    __tablename__ = "dprs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dpr_number = Column(String, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    report_date = Column(Date, nullable=False)
    status = Column(Enum(DPRStatus, name="dprstatus"), default=DPRStatus.draft)
    weather = Column(Enum(WeatherCondition, name="weathercondition"), default=WeatherCondition.sunny)
    temperature_celsius = Column(Numeric(4, 1), nullable=True)
    work_done = Column(JSON, default=list)
    manpower = Column(JSON, default=list)
    equipment = Column(JSON, default=list)
    materials_used = Column(JSON, default=list)
    issues = Column(Text, nullable=True)
    safety_observations = Column(Text, nullable=True)
    visitors = Column(JSON, default=list)
    photos = Column(JSON, default=list)
    total_workers = Column(Integer, default=0)
    remarks = Column(Text, nullable=True)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

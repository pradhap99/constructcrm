from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class LeadStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    proposal = "proposal"
    negotiation = "negotiation"
    won = "won"
    lost = "lost"


class LeadSource(str, enum.Enum):
    referral = "referral"
    website = "website"
    social_media = "social_media"
    cold_call = "cold_call"
    exhibition = "exhibition"
    other = "other"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    company = Column(String, nullable=True)
    project_type = Column(String, nullable=True)
    budget_range = Column(String, nullable=True)
    location = Column(String, nullable=True)
    status = Column(Enum(LeadStatus, name="leadstatus"), default=LeadStatus.new)
    source = Column(Enum(LeadSource, name="leadsource"), default=LeadSource.other)
    notes = Column(Text, nullable=True)
    assigned_to = Column(UUID(as_uuid=True), nullable=True)
    estimated_value = Column(Numeric(15, 2), nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

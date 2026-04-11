import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SubmittalStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    approved = "approved"
    approved_with_comments = "approved_with_comments"
    rejected = "rejected"
    resubmit = "resubmit"


class SubmittalType(str, enum.Enum):
    material_approval = "material_approval"
    shop_drawing = "shop_drawing"
    method_statement = "method_statement"
    test_report = "test_report"
    catalogue = "catalogue"
    mock_up = "mock_up"
    other = "other"


class Submittal(Base):
    __tablename__ = "submittals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submittal_number = Column(String, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    submittal_type = Column(Enum(SubmittalType, name="submittaltype"), default=SubmittalType.material_approval)
    status = Column(Enum(SubmittalStatus, name="submittalstatus"), default=SubmittalStatus.draft)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    spec_section = Column(String, nullable=True)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    submission_date = Column(DateTime, nullable=True)
    review_date = Column(DateTime, nullable=True)
    revision = Column(String, default="A")
    documents = Column(JSON, default=list)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

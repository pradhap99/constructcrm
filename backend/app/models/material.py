from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class MaterialStatus(str, enum.Enum):
    match = "match"
    mismatch = "mismatch"
    pending = "pending"


class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    work_package = Column(String, nullable=True)
    unit = Column(String, nullable=False, default="Nos")
    ordered_qty = Column(Numeric(15, 3), default=0)
    received_qty = Column(Numeric(15, 3), default=0)
    installed_qty = Column(Numeric(15, 3), default=0)
    rate = Column(Numeric(15, 2), default=0)
    status = Column(Enum(MaterialStatus, name="materialstatus"), default=MaterialStatus.pending)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", foreign_keys=[project_id])

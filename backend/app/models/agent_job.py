from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class AgentJobType(str, enum.Enum):
    reconciliation = "reconciliation"
    risk = "risk"
    chase = "chase"
    document_parse = "document_parse"


class AgentJobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class AgentJob(Base):
    __tablename__ = "agent_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type = Column(Enum(AgentJobType, name="agentjobtype"), nullable=False)
    status = Column(Enum(AgentJobStatus, name="agentjobstatus"), default=AgentJobStatus.pending)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", foreign_keys=[project_id])
    created_by_user = relationship("User", foreign_keys=[created_by])

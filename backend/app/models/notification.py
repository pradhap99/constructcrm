from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class NotificationSeverity(str, enum.Enum):
    critical = "critical"
    warning = "warning"
    info = "info"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(Enum(NotificationSeverity, name="notificationseverity"), default=NotificationSeverity.info)
    is_seen = Column(Boolean, default=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", foreign_keys=[project_id])

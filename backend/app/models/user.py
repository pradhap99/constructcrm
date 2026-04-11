import uuid
from datetime import datetime, timezone, timezone
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    project_manager = "project_manager"
    site_engineer = "site_engineer"
    purchase_manager = "purchase_manager"
    accounts = "accounts"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole, name="userrole"), default=UserRole.viewer)
    is_active = Column(Boolean, default=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=lambda: datetime.now(timezone.utc))

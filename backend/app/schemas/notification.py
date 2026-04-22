from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas._base import ResponseBase
from app.models.notification import NotificationSeverity


class NotificationCreate(BaseModel):
    title: str
    message: str
    severity: NotificationSeverity = NotificationSeverity.info
    project_id: Optional[str] = None
    user_id: Optional[str] = None


class NotificationResponse(ResponseBase):

    id: str
    title: str
    message: str
    severity: NotificationSeverity
    is_seen: bool
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None

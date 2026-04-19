from typing import Optional, Any, Dict, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.document import DocumentStatus


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_name: str
    status: DocumentStatus
    project_id: Optional[str] = None
    created_by: str
    extracted_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    excel_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DocumentStatusEvent(BaseModel):
    id: str
    status: DocumentStatus
    message: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    excel_url: Optional[str] = None

from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.submittal import SubmittalStatus, SubmittalType


class SubmittalCreate(BaseModel):
    submittal_number: str
    project_id: str
    submitted_by: str
    submittal_type: SubmittalType = SubmittalType.material_approval
    status: SubmittalStatus = SubmittalStatus.draft
    title: str
    description: Optional[str] = None
    spec_section: Optional[str] = None
    submission_date: Optional[datetime] = None
    revision: str = "A"
    documents: List[Any] = []
    comments: Optional[str] = None


class SubmittalUpdate(BaseModel):
    submittal_type: Optional[SubmittalType] = None
    status: Optional[SubmittalStatus] = None
    title: Optional[str] = None
    description: Optional[str] = None
    spec_section: Optional[str] = None
    reviewed_by: Optional[str] = None
    submission_date: Optional[datetime] = None
    review_date: Optional[datetime] = None
    revision: Optional[str] = None
    documents: Optional[List[Any]] = None
    comments: Optional[str] = None


class SubmittalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    submittal_number: str
    project_id: str
    submitted_by: str
    submittal_type: SubmittalType
    status: SubmittalStatus
    title: str
    description: Optional[str] = None
    spec_section: Optional[str] = None
    reviewed_by: Optional[str] = None
    submission_date: Optional[datetime] = None
    review_date: Optional[datetime] = None
    revision: str
    documents: List[Any] = []
    comments: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

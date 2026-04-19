from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.agent_job import AgentJobType, AgentJobStatus


class AgentJobCreate(BaseModel):
    job_type: AgentJobType
    project_id: Optional[str] = None
    input_data: Dict[str, Any] = {}


class AgentJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_type: AgentJobType
    status: AgentJobStatus
    project_id: Optional[str] = None
    created_by: str
    input_data: Dict[str, Any] = {}
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_by_name: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

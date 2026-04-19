from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.agent_job import AgentJob, AgentJobStatus
from app.schemas.agent_job import AgentJobCreate, AgentJobResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/agent-jobs", tags=["agent-jobs"])


def _enrich(j: AgentJob) -> dict:
    data = {c.name: getattr(j, c.name) for c in j.__table__.columns}
    data["id"] = str(data["id"])
    data["created_by"] = str(data["created_by"])
    data["project_id"] = str(data["project_id"]) if data["project_id"] else None
    data["created_by_name"] = j.created_by_user.full_name if j.created_by_user else None
    return data


def _run_agent_job(job_id: str) -> None:
    """Background task: updates job status through RUNNING → COMPLETED/FAILED.
    Priority 4 will wire the actual Claude AI logic here."""
    db = SessionLocal()
    try:
        job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
        if not job:
            return
        job.status = AgentJobStatus.running
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        # Placeholder output — real agent logic wired in Priority 4
        job.status = AgentJobStatus.completed
        job.completed_at = datetime.now(timezone.utc)
        job.output_data = {"message": f"Agent job {job.job_type} queued for processing"}
        db.commit()
    except Exception as exc:
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            if job:
                job.status = AgentJobStatus.failed
                job.error_message = str(exc)
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.get("/", response_model=List[AgentJobResponse])
def list_agent_jobs(
    project_id: Optional[str] = None,
    job_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AgentJob)
    if project_id:
        q = q.filter(AgentJob.project_id == project_id)
    if job_type:
        q = q.filter(AgentJob.job_type == job_type)
    q = q.order_by(AgentJob.created_at.desc())
    items = q.offset(skip).limit(limit).all()
    return [AgentJobResponse(**_enrich(j)) for j in items]


@router.get("/{job_id}", response_model=AgentJobResponse)
def get_agent_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(AgentJob).filter(AgentJob.id == job_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Agent job not found")
    return AgentJobResponse(**_enrich(item))


@router.post("/", response_model=AgentJobResponse, status_code=status.HTTP_201_CREATED)
def create_agent_job(
    item_in: AgentJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = AgentJob(
        id=uuid.uuid4(),
        job_type=item_in.job_type,
        project_id=item_in.project_id,
        created_by=current_user.id,
        input_data=item_in.input_data,
        status=AgentJobStatus.pending,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(_run_agent_job, str(job.id))
    return AgentJobResponse(**_enrich(job))

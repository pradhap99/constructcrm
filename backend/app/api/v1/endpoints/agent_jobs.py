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
    """Background task: runs real Claude AI for each job type."""
    db = SessionLocal()
    try:
        try:
            _job_id = uuid.UUID(job_id)
        except (ValueError, AttributeError):
            raise HTTPException(status_code=404, detail="Not found")
        job = db.query(AgentJob).filter(AgentJob.id == _job_id).first()
        if not job:
            return
        job.status = AgentJobStatus.running
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        output = _execute_agent(db, job)

        job.status = AgentJobStatus.completed
        job.completed_at = datetime.now(timezone.utc)
        job.output_data = output
        db.commit()
    except Exception as exc:
        try:
            job = db.query(AgentJob).filter(AgentJob.id == _job_id).first()
            if job:
                job.status = AgentJobStatus.failed
                job.error_message = str(exc)
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _execute_agent(db, job: AgentJob) -> dict:
    from app.config import settings
    from app.models.project import Project
    from app.models.material import Material
    from app.models.billing import Billing
    import anthropic
    import json, re

    api_key = settings.ANTHROPIC_API_KEY

    # Gather project context
    project_name = "Unknown Project"
    project_context = ""
    if job.project_id:
        proj = db.query(Project).filter(Project.id == job.project_id).first()
        if proj:
            project_name = proj.name
            project_context = f"Project: {proj.name} | Budget: ₹{proj.budget_amount} | Status: {proj.status} | Client: {proj.client_name}"

    job_type = job.job_type.value if hasattr(job.job_type, 'value') else str(job.job_type)

    if job_type == "reconciliation":
        # Fetch materials for the project
        materials = []
        if job.project_id:
            mats = db.query(Material).filter(Material.project_id == job.project_id).all()
            for m in mats:
                materials.append(f"- {m.name}: Ordered={m.ordered_qty}{m.unit}, Received={m.received_qty}{m.unit}, Installed={m.installed_qty}{m.unit}, Rate=₹{m.rate}, Status={m.status.value if hasattr(m.status,'value') else m.status}")

        mat_text = "\n".join(materials) if materials else "No material records found for this project."

        prompt = f"""You are a construction materials reconciliation expert.
{project_context}

Material inventory:
{mat_text}

Perform a reconciliation analysis. Identify:
1. Materials with received quantity greater than installed (wastage risk)
2. Materials with ordered quantity not yet received (delivery delay)
3. Materials with status mismatch
4. Value at risk (uninstalled received materials × rate)

Return a JSON object:
{{
  "summary": "2-3 sentence executive summary",
  "total_value_at_risk": 0,
  "flags": [
    {{"material": "name", "issue": "description", "severity": "high|medium|low", "recommended_action": "action"}}
  ],
  "overall_health": "good|warning|critical"
}}
Return ONLY valid JSON, no markdown."""

        if not api_key:
            return {
                "summary": f"Material reconciliation for {project_name}. {len(materials)} materials analysed. API key not configured — set ANTHROPIC_API_KEY in .env to enable real AI analysis.",
                "total_value_at_risk": 0,
                "flags": [],
                "overall_health": "warning"
            }

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=1024, messages=[{"role":"user","content":prompt}])
        raw = msg.content[0].text.strip()
        raw = re.sub(r"^```json\s*", "", raw); raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)

    elif job_type == "risk":
        prompt = f"""You are a construction project risk analyst.
{project_context}

Additional context: {json.dumps(job.input_data)}

Perform a comprehensive risk assessment covering:
1. Schedule risk
2. Budget/cost overrun risk
3. Compliance and regulatory risk
4. Resource and manpower risk
5. Site and safety risk

Return a JSON object:
{{
  "summary": "2-3 sentence executive summary",
  "overall_risk_level": "low|medium|high|critical",
  "risk_score": 65,
  "risks": [
    {{"category": "Schedule|Budget|Compliance|Resource|Safety", "description": "risk description", "probability": "low|medium|high", "impact": "low|medium|high", "mitigation": "recommended action"}}
  ],
  "top_recommendation": "Most important action to take immediately"
}}
Return ONLY valid JSON, no markdown."""

        if not api_key:
            return {
                "summary": f"Risk assessment for {project_name}. API key not configured — set ANTHROPIC_API_KEY in .env to enable real AI analysis.",
                "overall_risk_level": "medium",
                "risk_score": 50,
                "risks": [],
                "top_recommendation": "Configure ANTHROPIC_API_KEY to get real AI risk analysis."
            }

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=1024, messages=[{"role":"user","content":prompt}])
        raw = msg.content[0].text.strip()
        raw = re.sub(r"^```json\s*", "", raw); raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)

    elif job_type == "chase":
        # Fetch overdue billing records
        bills = []
        if job.project_id:
            from app.models.billing import Billing, BillingStatus
            import datetime
            today = datetime.date.today()
            billings = db.query(Billing).filter(Billing.project_id == job.project_id).all()
            for b in billings:
                status_val = b.status.value if hasattr(b.status, 'value') else str(b.status)
                if status_val not in ('paid', 'cancelled'):
                    bills.append(f"- Bill #{b.billing_number}: Amount=₹{b.total_amount}, Status={status_val}, Net=₹{b.net_amount}")

        bills_text = "\n".join(bills) if bills else "No outstanding bills found."

        prompt = f"""You are a construction billing and collections expert.
{project_context}

Outstanding bills:
{bills_text}

Draft a professional payment chase letter and provide collection strategy.

Return a JSON object:
{{
  "summary": "Brief summary of payment situation",
  "total_outstanding": 0,
  "letter": "Full professional payment chase letter text addressed to the client",
  "urgency": "low|medium|high",
  "recommended_actions": ["action1", "action2", "action3"]
}}
Return ONLY valid JSON, no markdown."""

        if not api_key:
            return {
                "summary": f"Payment chase for {project_name}. API key not configured — set ANTHROPIC_API_KEY in .env to enable real AI analysis.",
                "total_outstanding": 0,
                "letter": f"Dear Sir/Madam,\n\nThis is a reminder regarding outstanding payments for {project_name}.\n\nPlease process the pending bills at the earliest.\n\nRegards,\nConstruct CRM",
                "urgency": "medium",
                "recommended_actions": ["Configure ANTHROPIC_API_KEY to generate real chase letters"]
            }

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=1500, messages=[{"role":"user","content":prompt}])
        raw = msg.content[0].text.strip()
        raw = re.sub(r"^```json\s*", "", raw); raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)

    else:
        return {"message": f"Agent type '{job_type}' completed", "project": project_name}


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
    item = db.query(AgentJob).filter(AgentJob.id == _job_id).first()
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

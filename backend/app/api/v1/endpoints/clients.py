from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import distinct, func
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.api.deps import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])


class ClientResponse(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    project_count: int
    active_project_count: int
    total_contract_value: Optional[float] = None


@router.get("/", response_model=List[ClientResponse])
def list_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            Project.client_name,
            Project.client_email,
            Project.client_phone,
            func.count(Project.id).label("project_count"),
            func.sum(
                func.cast(Project.status == ProjectStatus.active, db.bind.dialect.name == "postgresql" and "int" or "INTEGER")
            ).label("active_count"),
            func.sum(func.coalesce(Project.contract_value, 0)).label("total_contract_value"),
        )
        .group_by(Project.client_name, Project.client_email, Project.client_phone)
        .order_by(Project.client_name)
        .all()
    )

    result = []
    for row in rows:
        # Count active projects separately (simple approach)
        active_count = (
            db.query(func.count(Project.id))
            .filter(Project.client_name == row.client_name, Project.status == ProjectStatus.active)
            .scalar()
        )
        result.append(
            ClientResponse(
                client_name=row.client_name,
                client_email=row.client_email,
                client_phone=row.client_phone,
                project_count=row.project_count,
                active_project_count=active_count or 0,
                total_contract_value=float(row.total_contract_value) if row.total_contract_value else None,
            )
        )
    return result

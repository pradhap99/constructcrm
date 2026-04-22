from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.user import User, UserRole
from app.api.deps import get_current_user
from datetime import datetime

router = APIRouter(prefix="/team", tags=["team"])


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None


@router.get("/", response_model=List[TeamMemberResponse])
def list_team(
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    return q.order_by(User.full_name).all()

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.models.project import Project
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _enrich(n: Notification) -> dict:
    data = {c.name: getattr(n, c.name) for c in n.__table__.columns}
    data["id"] = str(data["id"])
    data["project_id"] = str(data["project_id"]) if data["project_id"] else None
    data["user_id"] = str(data["user_id"]) if data["user_id"] else None
    data["project_name"] = n.project.name if n.project else None
    return data


@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    project_id: Optional[str] = None,
    is_seen: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Notification)
    if project_id:
        q = q.filter(Notification.project_id == project_id)
    if is_seen is not None:
        q = q.filter(Notification.is_seen == is_seen)
    q = q.order_by(Notification.created_at.desc())
    items = q.offset(skip).limit(limit).all()
    return [NotificationResponse(**_enrich(n)) for n in items]


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    item_in: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = Notification(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return NotificationResponse(**_enrich(item))


@router.patch("/{notification_id}/seen", response_model=NotificationResponse)
def mark_seen(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        _notification_id = uuid.UUID(notification_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Not found")
    item = db.query(Notification).filter(Notification.id == _notification_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    item.is_seen = True
    db.commit()
    db.refresh(item)
    return NotificationResponse(**_enrich(item))


@router.patch("/seen-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_seen(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(Notification.is_seen == False).update({"is_seen": True})  # noqa: E712
    db.commit()

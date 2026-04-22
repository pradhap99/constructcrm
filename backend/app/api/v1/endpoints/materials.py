from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.material import Material, MaterialStatus
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/materials", tags=["materials"])


def _enrich(m: Material) -> dict:
    data = {c.name: getattr(m, c.name) for c in m.__table__.columns}
    data["id"] = str(data["id"])
    data["project_id"] = str(data["project_id"])
    data["project_name"] = m.project.name if m.project else None
    return data


@router.get("/", response_model=List[MaterialResponse])
def list_materials(
    project_id: Optional[str] = None,
    work_package: Optional[str] = None,
    status: Optional[MaterialStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Material)
    if project_id:
        q = q.filter(Material.project_id == project_id)
    if work_package:
        q = q.filter(Material.work_package == work_package)
    if status:
        q = q.filter(Material.status == status)
    # Mismatches first, then by name
    q = q.order_by(
        Material.status.desc(),
        Material.name,
    )
    items = q.offset(skip).limit(limit).all()
    return [MaterialResponse(**_enrich(m)) for m in items]


@router.get("/{item_id}", response_model=MaterialResponse)
def get_material(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        _item_id = uuid.UUID(item_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Not found")
    item = db.query(Material).filter(Material.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Material not found")
    return MaterialResponse(**_enrich(item))


@router.post("/", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    item_in: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = Material(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return MaterialResponse(**_enrich(item))


@router.put("/{item_id}", response_model=MaterialResponse)
def update_material(
    item_id: str,
    item_in: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Material).filter(Material.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Material not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return MaterialResponse(**_enrich(item))


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Material).filter(Material.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(item)
    db.commit()

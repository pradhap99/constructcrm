from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.boq import BOQ
from app.schemas.boq import BOQCreate, BOQUpdate, BOQResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/boqs", tags=["boqs"])


@router.get("/", response_model=List[BOQResponse])
def list_boqs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(BOQ).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=BOQResponse)
def get_boq(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        _item_id = uuid.UUID(item_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Not found")
    item = db.query(BOQ).filter(BOQ.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ not found")
    return item


@router.post("/", response_model=BOQResponse, status_code=status.HTTP_201_CREATED)
def create_boq(item_in: BOQCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = BOQ(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=BOQResponse)
def update_boq(item_id: str, item_in: BOQUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(BOQ).filter(BOQ.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_boq(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(BOQ).filter(BOQ.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ not found")
    db.delete(item)
    db.commit()

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.rfq import RFQ
from app.schemas.rfq import RFQCreate, RFQUpdate, RFQResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/rfqs", tags=["rfqs"])


@router.get("/", response_model=List[RFQResponse])
def list_rfqs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(RFQ).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=RFQResponse)
def get_rfq(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        _item_id = uuid.UUID(item_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Not found")
    item = db.query(RFQ).filter(RFQ.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return item


@router.post("/", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
def create_rfq(item_in: RFQCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = RFQ(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=RFQResponse)
def update_rfq(item_id: str, item_in: RFQUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(RFQ).filter(RFQ.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="RFQ not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rfq(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(RFQ).filter(RFQ.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="RFQ not found")
    db.delete(item)
    db.commit()

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.dpr import DPR
from app.schemas.dpr import DPRCreate, DPRUpdate, DPRResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/dprs", tags=["dprs"])


@router.get("/", response_model=List[DPRResponse])
def list_dprs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(DPR).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=DPRResponse)
def get_dpr(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(DPR).filter(DPR.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DPR not found")
    return item


@router.post("/", response_model=DPRResponse, status_code=status.HTTP_201_CREATED)
def create_dpr(item_in: DPRCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = DPR(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=DPRResponse)
def update_dpr(item_id: str, item_in: DPRUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(DPR).filter(DPR.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DPR not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dpr(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(DPR).filter(DPR.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DPR not found")
    db.delete(item)
    db.commit()

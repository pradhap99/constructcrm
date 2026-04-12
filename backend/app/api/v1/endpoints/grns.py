from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.grn import GRN
from app.schemas.grn import GRNCreate, GRNUpdate, GRNResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/grns", tags=["grns"])


@router.get("/", response_model=List[GRNResponse])
def list_grns(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(GRN).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=GRNResponse)
def get_grn(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(GRN).filter(GRN.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="GRN not found")
    return item


@router.post("/", response_model=GRNResponse, status_code=status.HTTP_201_CREATED)
def create_grn(item_in: GRNCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = GRN(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=GRNResponse)
def update_grn(item_id: str, item_in: GRNUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(GRN).filter(GRN.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="GRN not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grn(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(GRN).filter(GRN.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="GRN not found")
    db.delete(item)
    db.commit()

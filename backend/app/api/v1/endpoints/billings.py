from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.billing import Billing
from app.schemas.billing import BillingCreate, BillingUpdate, BillingResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/billings", tags=["billings"])


@router.get("/", response_model=List[BillingResponse])
def list_billings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Billing).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=BillingResponse)
def get_billing(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Billing).filter(Billing.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Billing not found")
    return item


@router.post("/", response_model=BillingResponse, status_code=status.HTTP_201_CREATED)
def create_billing(item_in: BillingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Billing(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=BillingResponse)
def update_billing(item_id: str, item_in: BillingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Billing).filter(Billing.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Billing not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_billing(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Billing).filter(Billing.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Billing not found")
    db.delete(item)
    db.commit()

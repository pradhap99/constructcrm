from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.change_order import ChangeOrder
from app.schemas.change_order import ChangeOrderCreate, ChangeOrderUpdate, ChangeOrderResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/change-orders", tags=["change_orders"])


@router.get("/", response_model=List[ChangeOrderResponse])
def list_change_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ChangeOrder).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=ChangeOrderResponse)
def get_change_order(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(ChangeOrder).filter(ChangeOrder.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="ChangeOrder not found")
    return item


@router.post("/", response_model=ChangeOrderResponse, status_code=status.HTTP_201_CREATED)
def create_change_order(item_in: ChangeOrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = ChangeOrder(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=ChangeOrderResponse)
def update_change_order(item_id: str, item_in: ChangeOrderUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(ChangeOrder).filter(ChangeOrder.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="ChangeOrder not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_change_order(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(ChangeOrder).filter(ChangeOrder.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="ChangeOrder not found")
    db.delete(item)
    db.commit()

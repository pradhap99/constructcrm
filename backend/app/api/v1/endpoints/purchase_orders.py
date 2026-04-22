from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.purchase_order import PurchaseOrder
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/purchase-orders", tags=["purchase_orders"])


@router.get("/", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PurchaseOrder).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        _item_id = uuid.UUID(item_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Not found")
    item = db.query(PurchaseOrder).filter(PurchaseOrder.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="PurchaseOrder not found")
    return item


@router.post("/", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(item_in: PurchaseOrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = PurchaseOrder(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(item_id: str, item_in: PurchaseOrderUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(PurchaseOrder).filter(PurchaseOrder.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="PurchaseOrder not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(PurchaseOrder).filter(PurchaseOrder.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="PurchaseOrder not found")
    db.delete(item)
    db.commit()

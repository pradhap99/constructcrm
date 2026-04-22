from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("/", response_model=List[InvoiceResponse])
def list_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Invoice).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=InvoiceResponse)
def get_invoice(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        _item_id = uuid.UUID(item_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Not found")
    item = db.query(Invoice).filter(Invoice.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return item


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(item_in: InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Invoice(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=InvoiceResponse)
def update_invoice(item_id: str, item_in: InvoiceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Invoice).filter(Invoice.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Invoice).filter(Invoice.id == _item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(item)
    db.commit()

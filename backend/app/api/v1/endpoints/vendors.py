from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("/", response_model=List[VendorResponse])
def list_vendors(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Vendor).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=VendorResponse)
def get_vendor(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Vendor).filter(Vendor.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return item


@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(item_in: VendorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Vendor(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=VendorResponse)
def update_vendor(item_id: str, item_in: VendorUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Vendor).filter(Vendor.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Vendor).filter(Vendor.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(item)
    db.commit()

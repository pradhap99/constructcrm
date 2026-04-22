from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("/", response_model=List[LeadResponse])
def list_leads(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Lead).offset(skip).limit(limit).all()


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        lid = uuid.UUID(lead_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = db.query(Lead).filter(Lead.id == lid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(lead_in: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = Lead(id=uuid.uuid4(), **lead_in.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: str, lead_in: LeadUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        lid = uuid.UUID(lead_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = db.query(Lead).filter(Lead.id == lid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for field, value in lead_in.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        lid = uuid.UUID(lead_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = db.query(Lead).filter(Lead.id == lid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.indent import Indent
from app.schemas.indent import IndentCreate, IndentUpdate, IndentResponse
from app.api.deps import get_current_user
import uuid

router = APIRouter(prefix="/indents", tags=["indents"])


@router.get("/", response_model=List[IndentResponse])
def list_indents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Indent).offset(skip).limit(limit).all()


@router.get("/{item_id}", response_model=IndentResponse)
def get_indent(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Indent).filter(Indent.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Indent not found")
    return item


@router.post("/", response_model=IndentResponse, status_code=status.HTTP_201_CREATED)
def create_indent(item_in: IndentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Indent(id=uuid.uuid4(), **item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=IndentResponse)
def update_indent(item_id: str, item_in: IndentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Indent).filter(Indent.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Indent not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_indent(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Indent).filter(Indent.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Indent not found")
    db.delete(item)
    db.commit()

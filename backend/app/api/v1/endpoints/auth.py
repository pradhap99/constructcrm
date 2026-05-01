from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, Token, LoginRequest
from app.utils.auth import verify_password, get_password_hash, create_access_token
from pydantic import BaseModel, EmailStr
from typing import Optional, Any
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])


# Frontend-compatible register request: accepts firmName, firmSlug, name, email, password
class RegisterRequest(BaseModel):
    firmName: str
    firmSlug: str
    name: str
    email: EmailStr
    password: str


# Frontend-compatible response: { accessToken, user }
class AuthResponse(BaseModel):
    accessToken: str
    user: dict


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        id=uuid.uuid4(),
        email=body.email,
        full_name=body.name,
        hashed_password=get_password_hash(body.password),
        role="admin",  # firm owner is admin
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": user.email})
    return {
        "accessToken": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "name": user.full_name,
            "role": user.role,
            "firmName": body.firmName,
            "firmSlug": body.firmSlug,
        }
    }


@router.post("/login")
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User inactive")
    token = create_access_token(data={"sub": user.email})
    return {
        "accessToken": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "name": user.full_name,
            "role": user.role,
        }
    }

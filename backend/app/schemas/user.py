from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.viewer
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    phone: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

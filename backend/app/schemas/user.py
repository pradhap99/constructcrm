from typing import Optional, Any
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from app.schemas._base import ResponseBase
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


class UserResponse(ResponseBase):

    id: str

    @field_validator('id', mode='before')
    @classmethod
    def coerce_id(cls, v: Any) -> str:
        return str(v)
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

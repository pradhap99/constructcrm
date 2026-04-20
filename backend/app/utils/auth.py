import base64
import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    pad = 4 - len(s) % 4
    if pad != 4:
        s += "=" * pad
    return base64.urlsafe_b64decode(s)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = int(expire.timestamp())

    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _b64url_encode(json.dumps(payload).encode())
    signing_input = f"{header}.{body}".encode()
    sig = hmac.new(settings.SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    return f"{header}.{body}.{_b64url_encode(sig)}"


class JWTError(Exception):
    pass


def decode_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise JWTError("Invalid token format")
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(), signing_input, hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise JWTError("Invalid signature")
        payload = json.loads(_b64url_decode(payload_b64))
        if "exp" in payload and payload["exp"] < time.time():
            raise JWTError("Token expired")
        return payload
    except JWTError:
        return None
    except Exception:
        return None

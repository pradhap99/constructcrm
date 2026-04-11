"""Standalone seed data script"""
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal, engine
from app.models import *  # noqa: F401,F403
from app.database import Base
from app.utils.auth import get_password_hash
import uuid
from datetime import date


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin@constructcrm.com").first():
            print("Already seeded")
            return
        admin = User(
            id=uuid.uuid4(),
            email="admin@constructcrm.com",
            full_name="Admin User",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("Seeded successfully")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

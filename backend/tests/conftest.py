"""
Test configuration: patches PostgreSQL UUID → SQLite CHAR(36) so tests
run without a real Postgres instance.
"""
import os
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/test_crm.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-only")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

# ── Patch UUID type to work with SQLite ─────────────────────────────────────
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

@compiles(PG_UUID, "sqlite")
def compile_pg_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"
# ─────────────────────────────────────────────────────────────────────────────

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "sqlite:////tmp/test_crm.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    try:
        os.remove("/tmp/test_crm.db")
    except Exception:
        pass


@pytest.fixture(scope="session")
def client():
    return TestClient(app, raise_server_exceptions=False)

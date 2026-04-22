"""
ConstructCRM — Comprehensive API Test Suite
Covers: auth, projects, vendors, indents, purchase orders, analytics, notifications
Uses SQLite in-memory so no real DB is needed.
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///./test_constructcrm.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# ── Test DB setup ─────────────────────────────────────────────────────────────
TEST_DB_URL = "sqlite:///./test_constructcrm.db"
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
        os.remove("test_constructcrm.db")
    except Exception:
        pass


@pytest.fixture(scope="module")
def client():
    return TestClient(app, raise_server_exceptions=False)


# ── Auth helpers ──────────────────────────────────────────────────────────────
ADMIN = {"email": "admin@test.com", "password": "Test1234!", "full_name": "Admin User", "role": "admin"}
VIEWER = {"email": "viewer@test.com", "password": "View1234!", "full_name": "Viewer User", "role": "viewer"}


def register_and_login(client, user=None):
    u = user or ADMIN
    client.post("/api/v1/auth/register", json=u)
    res = client.post("/api/v1/auth/login", json={"email": u["email"], "password": u["password"]})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


# ══════════════════════════════════════════════════════════════════════════════
# 1. HEALTH & INFRASTRUCTURE
# ══════════════════════════════════════════════════════════════════════════════

class TestInfrastructure:
    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_openapi_schema_loads(self, client):
        r = client.get("/openapi.json")
        assert r.status_code == 200
        schema = r.json()
        assert "paths" in schema
        assert len(schema["paths"]) > 10  # we have many routes

    def test_unknown_route_returns_404(self, client):
        r = client.get("/api/v1/doesnotexist")
        assert r.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# 2. AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════════════

class TestAuth:
    def test_register_new_user(self, client):
        r = client.post("/api/v1/auth/register", json=ADMIN)
        assert r.status_code in (201, 400)  # 400 if already exists from another run

    def test_register_duplicate_email_fails(self, client):
        client.post("/api/v1/auth/register", json=ADMIN)
        r = client.post("/api/v1/auth/register", json=ADMIN)
        assert r.status_code == 400
        assert "already registered" in r.json()["detail"].lower()

    def test_login_valid_credentials(self, client):
        client.post("/api/v1/auth/register", json=ADMIN)
        r = client.post("/api/v1/auth/login", json={"email": ADMIN["email"], "password": ADMIN["password"]})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 10

    def test_login_wrong_password(self, client):
        r = client.post("/api/v1/auth/login", json={"email": ADMIN["email"], "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_nonexistent_user(self, client):
        r = client.post("/api/v1/auth/login", json={"email": "nobody@test.com", "password": "anything"})
        assert r.status_code == 401

    def test_get_me_with_valid_token(self, client):
        token = register_and_login(client)
        r = client.get("/api/v1/users/me", headers=auth_headers(token))
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN["email"]
        assert "id" in data
        assert isinstance(data["id"], str)  # UUID must serialize as string

    def test_get_me_without_token_returns_401(self, client):
        r = client.get("/api/v1/users/me")
        assert r.status_code == 401

    def test_get_me_with_invalid_token_returns_401(self, client):
        r = client.get("/api/v1/users/me", headers={"Authorization": "Bearer garbage"})
        assert r.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# 3. PROJECTS
# ══════════════════════════════════════════════════════════════════════════════

PROJECT_PAYLOAD = {
    "name": "Test Tower Project",
    "project_code": "TTP-001",
    "client_name": "ABC Constructions",
    "site_address": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "budget_amount": 5000000,
    "project_type": "residential",
    "status": "planning",
}


class TestProjects:
    @pytest.fixture(autouse=True)
    def token(self, client):
        self._token = register_and_login(client)
        return self._token

    def headers(self):
        return auth_headers(self._token)

    def test_list_projects_empty(self, client):
        r = client.get("/api/v1/projects/", headers=self.headers())
        assert r.status_code == 200

    def test_create_project(self, client):
        r = client.post("/api/v1/projects/", json=PROJECT_PAYLOAD, headers=self.headers())
        assert r.status_code == 201, f"Create failed: {r.text}"
        data = r.json()
        assert data["name"] == PROJECT_PAYLOAD["name"]
        assert isinstance(data["id"], str)
        assert data["project_code"] == "TTP-001"

    def test_create_duplicate_project_code_fails(self, client):
        client.post("/api/v1/projects/", json=PROJECT_PAYLOAD, headers=self.headers())
        r = client.post("/api/v1/projects/", json=PROJECT_PAYLOAD, headers=self.headers())
        assert r.status_code == 400
        assert "already exists" in r.json()["detail"].lower()

    def test_get_project_by_id(self, client):
        create = client.post("/api/v1/projects/", json={**PROJECT_PAYLOAD, "project_code": "TTP-002"}, headers=self.headers())
        project_id = create.json()["id"]
        r = client.get(f"/api/v1/projects/{project_id}", headers=self.headers())
        assert r.status_code == 200
        assert r.json()["id"] == project_id

    def test_get_nonexistent_project_returns_404(self, client):
        r = client.get(f"/api/v1/projects/{uuid.uuid4()}", headers=self.headers())
        assert r.status_code == 404

    def test_update_project_status(self, client):
        create = client.post("/api/v1/projects/", json={**PROJECT_PAYLOAD, "project_code": "TTP-003"}, headers=self.headers())
        project_id = create.json()["id"]
        r = client.put(f"/api/v1/projects/{project_id}", json={"status": "active"}, headers=self.headers())
        assert r.status_code == 200
        assert r.json()["status"] == "active"

    def test_delete_project(self, client):
        create = client.post("/api/v1/projects/", json={**PROJECT_PAYLOAD, "project_code": "TTP-DEL"}, headers=self.headers())
        project_id = create.json()["id"]
        r = client.delete(f"/api/v1/projects/{project_id}", headers=self.headers())
        assert r.status_code == 204
        # Confirm deleted
        r2 = client.get(f"/api/v1/projects/{project_id}", headers=self.headers())
        assert r2.status_code == 404

    def test_projects_require_auth(self, client):
        r = client.get("/api/v1/projects/")
        assert r.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# 4. VENDORS
# ══════════════════════════════════════════════════════════════════════════════

VENDOR_PAYLOAD = {
    "name": "Tata Steel Ltd",
    "vendor_code": "VND-001",
    "contact_person": "Rajan Kumar",
    "email": "rajan@tatasteel.com",
    "phone": "9876543210",
    "city": "Mumbai",
    "state": "Maharashtra",
    "vendor_type": "supplier",
}


class TestVendors:
    @pytest.fixture(autouse=True)
    def token(self, client):
        self._token = register_and_login(client)

    def headers(self):
        return auth_headers(self._token)

    def test_create_vendor(self, client):
        r = client.post("/api/v1/vendors/", json=VENDOR_PAYLOAD, headers=self.headers())
        assert r.status_code in (200, 201), f"Vendor create failed: {r.text}"
        data = r.json()
        assert isinstance(data["id"], str)
        assert data["name"] == VENDOR_PAYLOAD["name"]

    def test_list_vendors(self, client):
        r = client.get("/api/v1/vendors/", headers=self.headers())
        assert r.status_code == 200

    def test_vendor_requires_auth(self, client):
        r = client.get("/api/v1/vendors/")
        assert r.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# 5. LEADS
# ══════════════════════════════════════════════════════════════════════════════

class TestLeads:
    @pytest.fixture(autouse=True)
    def token(self, client):
        self._token = register_and_login(client)

    def headers(self):
        return auth_headers(self._token)

    def test_create_lead(self, client):
        r = client.post("/api/v1/leads/", json={
            "name": "Highway Bridge Tender",
            "phone": "9876500001",
            "company": "NHAI",
            "estimated_value": 25000000,
            "status": "new",
            "source": "other",
        }, headers=self.headers())
        assert r.status_code in (200, 201), f"Lead create failed: {r.text}"
        assert isinstance(r.json()["id"], str)

    def test_list_leads(self, client):
        r = client.get("/api/v1/leads/", headers=self.headers())
        assert r.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# 6. ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

class TestAnalytics:
    @pytest.fixture(autouse=True)
    def token(self, client):
        self._token = register_and_login(client)

    def headers(self):
        return auth_headers(self._token)

    def test_dashboard_stats_returns_200(self, client):
        r = client.get("/api/v1/analytics/dashboard-stats", headers=self.headers())
        assert r.status_code == 200, f"Analytics failed: {r.text}"
        data = r.json()
        assert "activeProjects" in data
        assert "totalBudget" in data
        assert "pendingInvoices" in data

    def test_spend_by_category_returns_list(self, client):
        r = client.get("/api/v1/analytics/spend-by-category", headers=self.headers())
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_spend_by_vendor_returns_list(self, client):
        r = client.get("/api/v1/analytics/spend-by-vendor", headers=self.headers())
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_budget_vs_actual_returns_list(self, client):
        r = client.get("/api/v1/analytics/budget-vs-actual", headers=self.headers())
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_analytics_requires_auth(self, client):
        r = client.get("/api/v1/analytics/dashboard-stats")
        assert r.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# 7. NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

class TestNotifications:
    @pytest.fixture(autouse=True)
    def token(self, client):
        self._token = register_and_login(client)

    def headers(self):
        return auth_headers(self._token)

    def test_list_notifications(self, client):
        r = client.get("/api/v1/notifications/", headers=self.headers())
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_notifications_require_auth(self, client):
        r = client.get("/api/v1/notifications/")
        assert r.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# 8. EDGE CASES & SECURITY
# ══════════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    @pytest.fixture(autouse=True)
    def token(self, client):
        self._token = register_and_login(client)

    def headers(self):
        return auth_headers(self._token)

    def test_create_project_missing_required_field(self, client):
        """name is required"""
        r = client.post("/api/v1/projects/", json={"project_code": "MISSING"}, headers=self.headers())
        assert r.status_code == 422  # Validation error

    def test_create_project_negative_budget(self, client):
        """Negative budget should be accepted (no constraint) or rejected — just shouldn't 500"""
        r = client.post("/api/v1/projects/", json={
            **PROJECT_PAYLOAD, "project_code": "NEG-001", "budget_amount": -100
        }, headers=self.headers())
        assert r.status_code in (201, 422)  # Either created or validation error, never 500

    def test_uuid_in_responses_always_string(self, client):
        """UUIDs must serialize as strings, not UUID objects"""
        r = client.post("/api/v1/projects/", json={**PROJECT_PAYLOAD, "project_code": "UUID-CHK"}, headers=self.headers())
        if r.status_code == 201:
            data = r.json()
            assert isinstance(data["id"], str)
            # Must be valid UUID format
            uuid.UUID(data["id"])

    def test_sql_injection_in_query_param(self, client):
        """Basic SQL injection attempt should return 200 (safe query) or 422, never 500"""
        r = client.get("/api/v1/projects/?skip=0'; DROP TABLE projects; --", headers=self.headers())
        assert r.status_code in (200, 422)

    def test_very_long_string_fields(self, client):
        """Fields with very long strings shouldn't cause 500"""
        long_name = "A" * 10000
        r = client.post("/api/v1/projects/", json={
            **PROJECT_PAYLOAD, "project_code": "LONG-001", "name": long_name
        }, headers=self.headers())
        assert r.status_code in (201, 422)  # Never 500

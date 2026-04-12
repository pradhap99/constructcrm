from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import date

from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus, ProjectType
from app.models.vendor import Vendor, VendorCategory, VendorStatus
from app.models.lead import Lead, LeadStatus, LeadSource
from app.utils.auth import get_password_hash

router = APIRouter(prefix="/seed", tags=["Seed"])


@router.post("/")
def seed_data(db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == "admin@constructcrm.com").first():
        return {"message": "Data already seeded"}

    admin = User(
        id=uuid.uuid4(),
        email="admin@constructcrm.com",
        full_name="Admin User",
        hashed_password=get_password_hash("admin123"),
        role=UserRole.admin,
        is_active=True,
        phone="+91-9800000001",
    )
    db.add(admin)

    pm = User(
        id=uuid.uuid4(),
        email="pm@constructcrm.com",
        full_name="Project Manager",
        hashed_password=get_password_hash("pm123456"),
        role=UserRole.project_manager,
        is_active=True,
        phone="+91-9800000002",
    )
    db.add(pm)

    project1 = Project(
        id=uuid.uuid4(),
        name="Skyline Residential Towers",
        project_code="PRJ-2024-001",
        description="25-storey luxury residential towers in Bandra West",
        project_type=ProjectType.residential,
        status=ProjectStatus.active,
        client_name="Skyline Developers Pvt Ltd",
        client_phone="+91-9900000001",
        client_email="info@skylinedev.com",
        site_address="Plot 45, Bandra West",
        city="Mumbai",
        state="Maharashtra",
        pincode="400050",
        total_area_sqft=250000,
        budget_amount=500000000,
        contract_value=480000000,
        start_date=date(2024, 1, 15),
        expected_end_date=date(2026, 6, 30),
        project_manager_id=pm.id,
        gstin="27ABCDE1234F1Z5",
        pan="ABCDE1234F",
    )
    db.add(project1)

    vendor1 = Vendor(
        id=uuid.uuid4(),
        name="BuildRight Materials Pvt Ltd",
        vendor_code="VND-001",
        category=VendorCategory.material_supplier,
        status=VendorStatus.active,
        contact_person="Ramesh Kumar",
        email="ramesh@buildright.com",
        phone="+91-9700000001",
        address="Industrial Area, Andheri East",
        city="Mumbai",
        state="Maharashtra",
        pincode="400093",
        gstin="27XYZAB5678G2H6",
        pan="XYZAB5678G",
        bank_name="HDFC Bank",
        bank_account_no="50200012345678",
        bank_ifsc="HDFC0001234",
        credit_limit=5000000,
        payment_terms_days="30",
        rating=4.2,
        is_msme=False,
        specializations=["Cement", "Steel", "Sand", "Aggregate"],
    )
    db.add(vendor1)

    lead1 = Lead(
        id=uuid.uuid4(),
        name="Priya Sharma",
        email="priya.sharma@email.com",
        phone="+91-9800011111",
        company="Sharma Enterprises",
        project_type="Commercial Office",
        budget_range="₹2-5 Crore",
        location="Pune, Maharashtra",
        status=LeadStatus.qualified,
        source=LeadSource.referral,
        notes="Interested in a 10,000 sqft office space in Hinjewadi",
        estimated_value=30000000,
        tags=["commercial", "office", "pune"],
    )
    db.add(lead1)

    db.commit()
    return {
        "message": "Seed data created successfully",
        "data": {
            "users": [
                "admin@constructcrm.com (password: admin123)",
                "pm@constructcrm.com (password: pm123456)",
            ],
            "projects": [project1.name],
            "vendors": [vendor1.name],
            "leads": [lead1.name],
        },
    }

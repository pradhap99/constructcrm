import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.models.lead import Lead, LeadStatus
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.models.invoice import Invoice
from app.models.grn import GRN
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_projects = db.query(Project).count()
    active_projects = db.query(Project).filter(Project.status == ProjectStatus.active).count()
    total_leads = db.query(Lead).count()
    won_leads = db.query(Lead).filter(Lead.status == LeadStatus.won).count()
    total_vendors = db.query(Vendor).count()
    total_pos = db.query(PurchaseOrder).count()
    total_invoices = db.query(Invoice).count()
    total_grns = db.query(GRN).count()

    return {
        "projects": {"total": total_projects, "active": active_projects},
        "leads": {"total": total_leads, "won": won_leads},
        "vendors": {"total": total_vendors},
        "purchase_orders": {"total": total_pos},
        "invoices": {"total": total_invoices},
        "grns": {"total": total_grns},
    }

import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from decimal import Decimal
from datetime import datetime, timezone
import calendar
from app.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.lead import Lead, LeadStatus
from app.models.grn import GRN
from app.models.vendor import Vendor
from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard-stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_budget = db.query(func.sum(Project.budget_amount)).scalar() or Decimal("0")
    active_projects = db.query(Project).filter(Project.status == ProjectStatus.active).count()
    open_leads = db.query(Lead).filter(
        Lead.status.in_([
            LeadStatus.new, LeadStatus.contacted, LeadStatus.qualified,
            LeadStatus.proposal, LeadStatus.negotiation,
        ])
    ).count()
    active_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.status.in_([POStatus.approved, POStatus.partially_delivered])
    ).count()
    pending_invoices = db.query(Invoice).filter(
        Invoice.status.in_([InvoiceStatus.submitted, InvoiceStatus.under_review])
    ).count()
    total_spend = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == InvoiceStatus.paid
    ).scalar() or Decimal("0")
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1)
    monthly_spend = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == InvoiceStatus.paid,
        Invoice.invoice_date >= start_of_month,
    ).scalar() or Decimal("0")

    return {
        "total_spend": float(total_spend),
        "totalBudget": float(total_budget),
        "activeProjects": active_projects,
        "active_projects": active_projects,
        "activePOs": active_pos,
        "active_pos": active_pos,
        "pendingInvoices": pending_invoices,
        "pending_invoices": pending_invoices,
        "monthlySpend": float(monthly_spend),
        "monthly_spend": float(monthly_spend),
        "openLeads": open_leads,
        "open_leads": open_leads,
    }


@router.get("/spend-by-category")
def spend_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Group by project name as a proxy for category
    from app.models.project import Project as ProjectModel
    rows = (
        db.query(ProjectModel.name, func.sum(PurchaseOrder.total_amount).label("amount"))
        .join(PurchaseOrder, PurchaseOrder.project_id == ProjectModel.id, isouter=True)
        .group_by(ProjectModel.name)
        .all()
    )
    total = sum(float(r.amount or 0) for r in rows) or 1
    return [
        {
            "category": r.name or "Uncategorized",
            "amount": float(r.amount or 0),
            "percentage": round(float(r.amount or 0) / total * 100, 1),
        }
        for r in rows
    ]


@router.get("/spend-by-vendor")
def spend_by_vendor(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Vendor.name, func.sum(Invoice.total_amount).label("amount"))
        .join(Invoice, Invoice.vendor_id == Vendor.id)
        .filter(Invoice.status == InvoiceStatus.paid)
        .group_by(Vendor.name)
        .order_by(func.sum(Invoice.total_amount).desc())
        .limit(10)
        .all()
    )
    total = sum(float(r.amount or 0) for r in rows) or 1
    return [
        {
            "vendor_name": r.name,
            "vendorName": r.name,
            "amount": float(r.amount or 0),
            "percentage": round(float(r.amount or 0) / total * 100, 1),
        }
        for r in rows
    ]


@router.get("/budget-vs-actual")
def budget_vs_actual(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            extract('year', Invoice.invoice_date).label("year"),
            extract('month', Invoice.invoice_date).label("month_num"),
            func.sum(Invoice.total_amount).label("actual"),
        )
        .filter(Invoice.invoice_date.isnot(None))
        .group_by(
            extract('year', Invoice.invoice_date),
            extract('month', Invoice.invoice_date),
        )
        .order_by(
            extract('year', Invoice.invoice_date),
            extract('month', Invoice.invoice_date),
        )
        .limit(12)
        .all()
    )
    return [
        {
            "month": f"{calendar.month_abbr[int(r.month_num)]} {int(r.year)}",
            "budget": 0,
            "actual": float(r.actual or 0),
        }
        for r in rows
    ]

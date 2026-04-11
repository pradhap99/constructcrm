from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    projects,
    leads,
    vendors,
    indents,
    rfqs,
    comparatives,
    purchase_orders,
    grns,
    invoices,
    dprs,
    boqs,
    submittals,
    change_orders,
    billings,
    dashboard,
    ai_parser,
    seed,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(leads.router)
api_router.include_router(vendors.router)
api_router.include_router(indents.router)
api_router.include_router(rfqs.router)
api_router.include_router(comparatives.router)
api_router.include_router(purchase_orders.router)
api_router.include_router(grns.router)
api_router.include_router(invoices.router)
api_router.include_router(dprs.router)
api_router.include_router(boqs.router)
api_router.include_router(submittals.router)
api_router.include_router(change_orders.router)
api_router.include_router(billings.router)
api_router.include_router(dashboard.router)
api_router.include_router(ai_parser.router)
api_router.include_router(seed.router)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.config import settings
from app.database import Base, engine
import app.models  # noqa: F401 — ensure all models are registered before create_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Creates any tables that don't yet exist (safe to run on every startup)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="ConstructCRM API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}

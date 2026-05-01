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

    # Pre-load the sentence-transformer model on startup so the first user
    # request doesn't trigger a ~60 second cold download from HuggingFace.
    # If HF_SENTENCE_MODEL is set, loads your fine-tuned model.
    # If not set, loads the default paraphrase-multilingual-mpnet-base-v2.
    try:
        from app.services.ai_reader import _get_sentence_model
        _get_sentence_model()
    except Exception as e:
        print(f"[Startup] Sentence model preload skipped: {e}")

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

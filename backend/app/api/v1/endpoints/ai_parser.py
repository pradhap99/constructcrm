import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ai_parser import AIParseRequest, AIParseResponse
from app.services import ai_parser as ai_service
from app.config import settings
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/ai-parser", tags=["AI Parser"])


@router.post("/parse", response_model=AIParseResponse)
async def parse_document(
    request: AIParseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text content is required")

    if settings.OPENAI_API_KEY:
        data = await ai_service.parse_with_openai(
            request.text, request.document_type, settings.OPENAI_API_KEY
        )
        confidence = 0.85
    else:
        data = ai_service.extract_document(request.text, request.document_type)
        confidence = 0.6

    return AIParseResponse(
        success=True,
        document_type=request.document_type,
        extracted_data=data,
        confidence=confidence,
        raw_text=request.text,
    )

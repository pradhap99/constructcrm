from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class AIParseRequest(BaseModel):
    text: Optional[str] = None
    document_type: str = "invoice"


class AIParseResponse(BaseModel):
    success: bool
    document_type: str
    extracted_data: Dict[str, Any] = {}
    confidence: float = 0.0
    raw_text: Optional[str] = None
    errors: List[str] = []

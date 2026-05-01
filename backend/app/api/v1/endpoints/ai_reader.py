"""
AI Reader endpoint
POST /api/v1/ai-reader/fill
  - vendor_docs: List[UploadFile]  (multiple vendor documents)
  - template:    UploadFile         (single result template)
  - instructions: str (optional)

For Excel templates  → returns a filled .xlsx file (StreamingResponse)
For Word templates   → returns a filled .docx file (StreamingResponse)
For other templates  → returns JSON { filled_text, vendor_count, ... }
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Optional
import io
import urllib.parse
import unicodedata

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.config import settings
from app.services import ai_reader as svc
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ai-reader", tags=["AI Reader"])

ALLOWED_EXTENSIONS = {
    "pdf", "docx", "doc", "xlsx", "xls", "txt", "csv", "md",
    # images — vendor quotes can be photographed or scanned
    "jpg", "jpeg", "png", "tiff", "tif", "bmp", "webp",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _check_file(f: UploadFile) -> None:
    ext = (f.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File '{f.filename}' has unsupported type .{ext}. "
                   f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )


def _get_ext(filename: str) -> str:
    return (filename or "").rsplit(".", 1)[-1].lower()


def _content_disposition(filename: str) -> str:
    """
    Build a safe Content-Disposition header that handles non-ASCII filenames
    (e.g. French accents). Uses RFC 5987 UTF-8 encoding alongside a plain ASCII
    fallback for older clients.
    """
    # Normalise to NFC so accented chars are single code points
    filename = unicodedata.normalize("NFC", filename)
    # ASCII fallback: strip non-ASCII chars
    ascii_name = filename.encode("ascii", errors="ignore").decode("ascii") or "file"
    # RFC 5987 percent-encoded UTF-8 name
    encoded_name = urllib.parse.quote(filename, safe=" ()-_.")
    return f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded_name}'


@router.post("/fill")
async def fill_template(
    vendor_docs: List[UploadFile] = File(..., description="One or more vendor documents"),
    template: UploadFile = File(..., description="Single result template file"),
    instructions: Optional[str] = Form(None, description="Extra instructions for the AI"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ── Validate ──────────────────────────────────────────────────────────────
    if not vendor_docs:
        raise HTTPException(status_code=400, detail="At least one vendor document is required")

    for f in vendor_docs:
        _check_file(f)
    _check_file(template)

    # ── Read vendor docs ──────────────────────────────────────────────────────
    vendor_data = []
    for f in vendor_docs:
        raw = await f.read()
        if len(raw) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"'{f.filename}' exceeds 20 MB limit")
        text = svc.extract_text(f.filename or "file.txt", raw)
        vendor_data.append({"filename": f.filename, "text": text, "raw_bytes": raw})

    # ── Read template ─────────────────────────────────────────────────────────
    tmpl_raw = await template.read()
    if len(tmpl_raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Template file exceeds 20 MB limit")

    tmpl_ext = _get_ext(template.filename or "template.txt")
    tmpl_text = svc.extract_text(template.filename or "template.txt", tmpl_raw)
    tmpl_data = {"filename": template.filename, "text": tmpl_text}

    extra = instructions or ""

    # ── Route by template type ────────────────────────────────────────────────
    try:
        if tmpl_ext in ("xlsx", "xls"):
            # ── Excel template → return filled Excel file ─────────────────────
            filled_bytes, provider, summary = await svc.fill_excel_template(
                vendor_docs=vendor_data,
                template_bytes=tmpl_raw,
                template_filename=template.filename or "template.xlsx",
                gemini_key=settings.GEMINI_API_KEY,
                groq_key=settings.GROQ_API_KEY,
                claude_key=settings.ANTHROPIC_API_KEY,
                hf_key=settings.HF_API_KEY,
                extra_instructions=extra,
            )
            out_name = (template.filename or "filled_template.xlsx").rsplit(".", 1)[0] + "_filled.xlsx"
            return StreamingResponse(
                content=io.BytesIO(filled_bytes),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": _content_disposition(out_name),
                    "X-Provider": provider,
                    "X-Summary": summary,
                    "X-Vendor-Count": str(len(vendor_data)),
                },
            )

        elif tmpl_ext in ("docx", "doc"):
            # ── Word template → return filled Word file ───────────────────────
            filled_text, provider = await svc.fill_text_template(
                vendor_docs=vendor_data,
                template=tmpl_data,
                gemini_key=settings.GEMINI_API_KEY,
                groq_key=settings.GROQ_API_KEY,
                claude_key=settings.ANTHROPIC_API_KEY,
                hf_key=settings.HF_API_KEY,
                extra_instructions=extra,
            )
            filled_bytes = svc.fill_docx_with_text(tmpl_raw, filled_text)
            out_name = (template.filename or "filled_template.docx").rsplit(".", 1)[0] + "_filled.docx"
            return StreamingResponse(
                content=io.BytesIO(filled_bytes),
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": _content_disposition(out_name),
                    "X-Provider": provider,
                    "X-Vendor-Count": str(len(vendor_data)),
                },
            )

        else:
            # ── Text / CSV / MD template → return JSON with filled text ───────
            filled_text, provider = await svc.fill_text_template(
                vendor_docs=vendor_data,
                template=tmpl_data,
                gemini_key=settings.GEMINI_API_KEY,
                groq_key=settings.GROQ_API_KEY,
                claude_key=settings.ANTHROPIC_API_KEY,
                hf_key=settings.HF_API_KEY,
                extra_instructions=extra,
            )
            return JSONResponse({
                "filled_text": filled_text,
                "vendor_count": len(vendor_data),
                "vendor_names": [d["filename"] for d in vendor_data],
                "template_name": template.filename,
                "used_ai": provider != "none",
                "provider": provider,
                "template_type": "text",
            })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

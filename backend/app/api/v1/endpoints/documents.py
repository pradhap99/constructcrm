import asyncio
import json
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.api.deps import get_current_user
from app.services.document_processor import process_document

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _to_response(doc: Document, request_base_url: str = "") -> DocumentResponse:
    excel_url = None
    if doc.excel_path and doc.status == DocumentStatus.done:
        excel_url = f"/api/v1/documents/{doc.id}/download"
    return DocumentResponse(
        id=str(doc.id),
        original_name=doc.original_name,
        status=doc.status,
        project_id=str(doc.project_id) if doc.project_id else None,
        created_by=str(doc.created_by),
        extracted_data=doc.extracted_data,
        error_message=doc.error_message,
        excel_url=excel_url,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_id = uuid.uuid4()
    safe_name = file.filename.replace(" ", "_") if file.filename else "document"
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{safe_name}")

    # Save file synchronously (UploadFile.read() is async)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    doc = Document(
        id=doc_id,
        original_name=file.filename or safe_name,
        file_path=file_path,
        project_id=project_id,
        created_by=current_user.id,
        status=DocumentStatus.uploaded,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(
        process_document,
        str(doc_id),
        settings.ANTHROPIC_API_KEY,
    )

    return _to_response(doc)


@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Document)
    if project_id:
        q = q.filter(Document.project_id == project_id)
    q = q.order_by(Document.created_at.desc())
    return [_to_response(d) for d in q.offset(skip).limit(limit).all()]


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        _doc_id = uuid.UUID(doc_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Not found")
    doc = db.query(Document).filter(Document.id == _doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _to_response(doc)


@router.get("/{doc_id}/download")
def download_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == _doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != DocumentStatus.done or not doc.excel_path:
        raise HTTPException(status_code=400, detail="Excel not ready yet")
    if not os.path.exists(doc.excel_path):
        raise HTTPException(status_code=404, detail="Excel file missing on disk")
    stem = os.path.splitext(doc.original_name)[0]
    return FileResponse(
        path=doc.excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"{stem}_BOQ_Extract.xlsx",
    )


@router.get("/{doc_id}/status")
async def document_status_sse(
    doc_id: str,
    token: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    # Auth via query-param token because EventSource can't set headers
    current_user: Optional[User] = Depends(get_current_user),
):
    """Server-Sent Events stream — emits status updates until done/failed."""

    async def event_stream():
        from app.database import SessionLocal
        poll_db = SessionLocal()
        try:
            for _ in range(120):  # max 2 minutes (120 × 1s)
                doc = poll_db.query(Document).filter(Document.id == _doc_id).first()
                if not doc:
                    payload = json.dumps({"error": "not found"})
                    yield f"data: {payload}\n\n"
                    break

                excel_url = (
                    f"/api/v1/documents/{doc.id}/download"
                    if doc.status == DocumentStatus.done and doc.excel_path
                    else None
                )
                payload = json.dumps({
                    "id": str(doc.id),
                    "status": doc.status,
                    "extracted_data": doc.extracted_data,
                    "excel_url": excel_url,
                    "error_message": doc.error_message,
                    "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
                })
                yield f"data: {payload}\n\n"

                if doc.status in (DocumentStatus.done, DocumentStatus.failed):
                    break

                await asyncio.sleep(1)
        finally:
            poll_db.close()

    return StreamingResponse(event_stream(), media_type="text/event-stream")

"""Documents API routes: upload, list, extract fields, field correction"""
from datetime import datetime, timezone
import os
from pathlib import Path
import shutil
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import (
    Application, AuditEvent, Document, DocumentStatus,
    ExtractedField, User
)
from app.schemas.schemas import (
    DocumentOut, ExtractedFieldOut, FieldCorrectionRequest
)
from app.services.document_processing import (
    compute_sha256, extract_structured_fields, process_document, _try_parse_date
)

router = APIRouter(tags=["Documents"])


@router.get("/applications/{application_id}/documents", response_model=List[DocumentOut])
def list_documents(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    docs = (
        db.query(Document)
        .filter(Document.application_id == application_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    return docs


@router.post("/applications/{application_id}/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    application_id: str,
    file: UploadFile = File(...),
    document_type_code: str = Form(...),
    document_type_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Ensure upload directory exists
    upload_dir = settings.upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename or "upload.pdf").suffix
    unique_stored_name = f"{uuid.uuid4()}{file_ext}"
    dest_path = upload_dir / unique_stored_name

    # Write file to disk
    with dest_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = dest_path.stat().st_size
    file_hash = compute_sha256(dest_path)

    # Process document text & OCR
    proc_result = process_document(dest_path)
    extracted_text = proc_result.get("extracted_text", "")
    has_digital = proc_result.get("has_digital_text", False)
    page_count = proc_result.get("page_count", 1)
    extraction_method = proc_result.get("extraction_method", "none")

    # Extract dates heuristically
    expiry_date = None
    issue_date = None
    if "expir" in extracted_text.lower() or "valid till" in extracted_text.lower() or "valid up to" in extracted_text.lower():
        expiry_date = _try_parse_date(extracted_text)

    # Create document record
    doc = Document(
        application_id=application_id,
        document_type_code=document_type_code,
        document_type_name=document_type_name,
        original_filename=file.filename or "unnamed_document",
        stored_filename=unique_stored_name,
        file_path=str(dest_path),
        file_size_bytes=file_size,
        mime_type=file.content_type,
        file_hash=file_hash,
        status=DocumentStatus.EXTRACTED if extracted_text else DocumentStatus.UPLOADED,
        uploaded_by_id=current_user.id,
        page_count=page_count,
        has_digital_text=has_digital,
        extraction_method=extraction_method,
        extracted_text=extracted_text,
        expiry_date=expiry_date,
        issue_date=issue_date,
        is_demo=False,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Extract structured fields
    fields_data = extract_structured_fields(extracted_text, document_type_code)
    for fd in fields_data:
        val = fd.get("extracted_value")
        field_rec = ExtractedField(
            document_id=doc.id,
            field_name=fd["field_name"],
            field_label=fd["field_label"],
            extracted_value=val,
            effective_value=val,
            confidence=0.9 if fd.get("confidence_label") == "high" else 0.7,
            confidence_label=fd.get("confidence_label", "medium"),
            source_page=1,
            is_manually_corrected=False,
        )
        db.add(field_rec)

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=application_id,
        document_id=doc.id,
        event_type="document_uploaded",
        entity_type="document",
        entity_id=doc.id,
        description=f"Document '{doc.original_filename}' ({doc.document_type_name}) uploaded.",
    ))
    db.commit()

    return doc


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/documents/{document_id}/fields", response_model=List[ExtractedFieldOut])
def get_document_fields(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return db.query(ExtractedField).filter(ExtractedField.document_id == document_id).all()


@router.patch("/documents/fields/{field_id}", response_model=ExtractedFieldOut)
def correct_document_field(
    field_id: str,
    body: FieldCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    field = db.query(ExtractedField).filter(ExtractedField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    prev_val = field.effective_value
    field.corrected_value = body.corrected_value
    field.effective_value = body.corrected_value
    field.is_manually_corrected = True
    field.correction_note = body.correction_note
    field.corrected_by_id = current_user.id
    field.corrected_at = datetime.now(timezone.utc)

    # Document status updated to needs_correction or verified
    doc = field.document
    if doc:
        doc.status = DocumentStatus.EXTRACTED

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=doc.application_id if doc else None,
        document_id=doc.id if doc else None,
        event_type="field_corrected",
        entity_type="extracted_field",
        entity_id=field.id,
        description=f"Field '{field.field_label}' corrected from '{prev_val}' to '{body.corrected_value}'. Note: {body.correction_note or 'None'}",
        before_state=str(prev_val),
        after_state=str(body.corrected_value),
    ))
    db.commit()
    db.refresh(field)

    return field


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        # Fallback if demo file is not on disk yet: return empty placeholder text
        raise HTTPException(status_code=404, detail="Document file not found on server disk")

    return FileResponse(
        path=str(file_path),
        filename=doc.original_filename,
        media_type=doc.mime_type or "application/octet-stream"
    )


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    app_id = doc.application_id
    doc_name = doc.original_filename

    # Remove physical file if present
    try:
        p = Path(doc.file_path)
        if p.exists():
            p.unlink()
    except Exception:
        pass

    db.delete(doc)
    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=app_id,
        event_type="document_deleted",
        entity_type="document",
        entity_id=document_id,
        description=f"Document '{doc_name}' removed by {current_user.email}.",
    ))
    db.commit()

    return {"status": "ok", "message": f"Document '{doc_name}' successfully removed"}

"""External Verification routes: mock & live verification connectors"""
from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import (
    AuditEvent, Document, ExternalConnector, User,
    VerificationAttempt, VerificationStatus
)
from app.schemas.schemas import VerificationAttemptOut

router = APIRouter(prefix="/verification", tags=["External Verification & Connectors"])


class TriggerVerificationRequest(BaseModel):
    document_id: str
    connector_id: Optional[str] = None
    method: str = "api"  # "api", "qr_code", "digital_signature", "manual"
    source_name: Optional[str] = None
    submitted_value: Optional[str] = None


@router.get("/connectors")
def list_connectors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    connectors = db.query(ExternalConnector).all()
    # Format document_type_codes from JSON if stored as text
    results = []
    for c in connectors:
        doc_codes = []
        if c.document_type_codes:
            try:
                doc_codes = json.loads(c.document_type_codes)
            except Exception:
                doc_codes = [c.document_type_codes]
        results.append({
            "id": c.id,
            "name": c.name,
            "connector_type": c.connector_type,
            "is_configured": c.is_configured,
            "is_demo": c.is_demo,
            "endpoint_url": c.endpoint_url,
            "document_type_codes": doc_codes,
            "description": c.description,
            "status_note": c.status_note,
        })
    return results


@router.get("/documents/{document_id}", response_model=List[VerificationAttemptOut])
def get_document_verifications(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(VerificationAttempt)
        .filter(VerificationAttempt.document_id == document_id)
        .order_by(VerificationAttempt.created_at.desc())
        .all()
    )


@router.post("/verify", response_model=VerificationAttemptOut)
def trigger_external_verification(
    body: TriggerVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == body.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Determine connector and realistic simulated verification logic
    source = body.source_name or "National Verification Registry"
    submitted = body.submitted_value or doc.document_type_code

    now = datetime.now(timezone.utc)

    # Realistic demo verification results based on document characteristics
    status_result = VerificationStatus.VERIFIED
    returned_val = f"Registry Match Confirmed: {doc.original_filename}"
    err_reason = None
    notes = f"Verified via mock connector '{source}' for demo audit."

    if "expired" in doc.original_filename.lower() or (doc.expiry_date and doc.expiry_date.date() < now.date()):
        status_result = VerificationStatus.EXPIRED
        returned_val = "Expired Record in Registry"
        err_reason = "Document validity period has lapsed in external state authority record."
    elif "mismatch" in doc.original_filename.lower():
        status_result = VerificationStatus.MISMATCH
        returned_val = "Mismatch with Official Land/Municipal Record"
        err_reason = "Discrepancy found between applicant entry and municipal survey register."

    attempt = VerificationAttempt(
        document_id=doc.id,
        method=body.method,
        source_name=source,
        status=status_result,
        submitted_value=submitted,
        returned_value=returned_val,
        error_reason=err_reason,
        verified_by_id=current_user.id,
        verified_at=now,
        notes=notes,
    )
    db.add(attempt)

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=doc.application_id,
        document_id=doc.id,
        event_type="document_verified",
        entity_type="verification_attempt",
        entity_id=attempt.id,
        description=f"Verification attempted on '{doc.original_filename}' via {source}: {status_result.value}",
    ))
    db.commit()
    db.refresh(attempt)

    return attempt

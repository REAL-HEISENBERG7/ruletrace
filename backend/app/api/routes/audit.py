"""Audit Events API routes"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import AuditEvent, User
from app.schemas.schemas import AuditEventOut

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("", response_model=List[AuditEventOut])
def list_audit_events(
    application_id: Optional[str] = None,
    event_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AuditEvent)
    if application_id:
        query = query.filter(AuditEvent.application_id == application_id)
    if event_type:
        query = query.filter(AuditEvent.event_type == event_type)

    return query.order_by(AuditEvent.created_at.desc()).offset(skip).limit(limit).all()

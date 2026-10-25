"""Validation API routes: trigger validation runs, list findings, reviewer actions"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role, require_reviewer_or_admin
from app.db.database import get_db
from app.models.models import (
    Application, AuditEvent, FindingSeverity, Notification,
    ReviewAction, ReviewerAction, User, UserRole,
    ValidationFinding, ValidationRun, ValidationStatus, AlertSeverity
)
from app.schemas.schemas import (
    FindingOut, ReviewActionRequest, ValidationRunOut
)
from app.services.validation_engine import run_validation

router = APIRouter(tags=["Validation"])


@router.post("/applications/{application_id}/validate", response_model=ValidationRunOut)
def trigger_validation(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Run the deterministic validation engine
    validation_run = run_validation(db, app, triggered_by_id=current_user.id)

    # Automatically notify if critical deficiencies are discovered
    findings = db.query(ValidationFinding).filter(
        ValidationFinding.validation_run_id == validation_run.id
    ).all()

    crit_count = sum(1 for f in findings if f.severity == FindingSeverity.CRITICAL)
    if crit_count > 0:
        db.add(Notification(
            user_id=app.created_by_id,
            application_id=app.id,
            title=f"Critical Deficiencies Found ({crit_count})",
            message=f"Validation run completed for {app.reference_number}. {crit_count} critical deficiencies require resolution.",
            severity=AlertSeverity.CRITICAL,
            action_url=f"/applications/{app.id}/scrutiny",
        ))

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=app.id,
        event_type="validation_run_executed",
        entity_type="validation_run",
        entity_id=validation_run.id,
        description=f"Validation completed for {app.reference_number}: {validation_run.total_checks} checks, {validation_run.passed} passed, {validation_run.failed} failed, {validation_run.warnings} warnings.",
    ))
    db.commit()
    db.refresh(validation_run)

    return validation_run


@router.get("/applications/{application_id}/validation-runs", response_model=List[ValidationRunOut])
def get_application_validation_runs(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    runs = (
        db.query(ValidationRun)
        .filter(ValidationRun.application_id == application_id)
        .order_by(ValidationRun.started_at.desc())
        .all()
    )
    return runs


@router.get("/applications/{application_id}/findings", response_model=List[FindingOut])
def list_application_findings(
    application_id: str,
    severity: Optional[str] = None,
    finding_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    review_status: Optional[str] = None,
    document_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    query = db.query(ValidationFinding).filter(ValidationFinding.application_id == application_id)

    if severity:
        query = query.filter(ValidationFinding.severity == severity)
    if finding_type:
        query = query.filter(ValidationFinding.finding_type == finding_type)
    if status_filter:
        query = query.filter(ValidationFinding.status == status_filter)
    if review_status:
        query = query.filter(ValidationFinding.review_status == review_status)
    if document_id:
        query = query.filter(ValidationFinding.document_id == document_id)

    return query.order_by(ValidationFinding.created_at.desc()).all()


@router.get("/findings/{finding_id}", response_model=FindingOut)
def get_finding(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    f = db.query(ValidationFinding).filter(ValidationFinding.id == finding_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    return f


@router.post("/findings/{finding_id}/review", response_model=FindingOut)
def review_finding(
    finding_id: str,
    body: ReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer_or_admin),
):
    finding = db.query(ValidationFinding).filter(ValidationFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    now = datetime.now(timezone.utc)

    # Validate action
    try:
        action_enum = ReviewAction(body.action)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid review action: {body.action}")

    # Create ReviewerAction record
    rev_action = ReviewerAction(
        finding_id=finding.id,
        reviewer_id=current_user.id,
        action=action_enum,
        notes=body.notes,
        corrected_field=body.corrected_field,
        corrected_value=body.corrected_value,
        previous_value=finding.evidence_value,
    )
    db.add(rev_action)

    # Update finding state
    finding.reviewer_id = current_user.id
    finding.reviewer_notes = body.notes
    finding.reviewed_at = now
    finding.review_status = "reviewed"

    if action_enum == ReviewAction.FALSE_POSITIVE:
        finding.is_false_positive = True
        finding.status = ValidationStatus.PASS
        finding.review_status = "closed"
    elif action_enum == ReviewAction.CONFIRMED:
        finding.is_false_positive = False
        finding.status = ValidationStatus.FAIL
    elif action_enum == ReviewAction.CORRECTED:
        finding.is_false_positive = False
        finding.review_status = "closed"
        finding.status = ValidationStatus.PASS
        if body.corrected_value:
            finding.evidence_value = body.corrected_value

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=finding.application_id,
        event_type="finding_reviewed",
        entity_type="validation_finding",
        entity_id=finding.id,
        description=f"Finding '{finding.title}' reviewed by {current_user.email} with action '{body.action}'. Notes: {body.notes or 'None'}",
    ))
    db.commit()
    db.refresh(finding)

    return finding

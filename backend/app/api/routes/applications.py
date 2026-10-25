"""Applications API routes"""
from datetime import datetime, timezone
import random
import string
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.database import get_db
from app.models.models import (
    Application, ApplicationStatus, AuditEvent, Document,
    FindingSeverity, Institution, User, UserRole, ValidationFinding, ValidationStatus
)
from app.schemas.schemas import (
    ApplicationCreate, ApplicationDetail, ApplicationOut, ApplicationUpdate,
    InstitutionOut, CategoryOut
)

router = APIRouter(prefix="/applications", tags=["Applications"])


def _gen_ref_number(year: str = "2024") -> str:
    rnd = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"AICTE-{year}-{rnd}"


@router.get("", response_model=List[ApplicationDetail])
def list_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    institution_id: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Application)

    # Institution role can only view their own institution's applications
    if current_user.role == UserRole.INSTITUTION:
        if current_user.institution_id:
            query = query.filter(Application.institution_id == current_user.institution_id)
        else:
            query = query.filter(Application.created_by_id == current_user.id)
    elif institution_id:
        query = query.filter(Application.institution_id == institution_id)

    if status_filter:
        query = query.filter(Application.status == status_filter)
    if category_id:
        query = query.filter(Application.category_id == category_id)
    if search:
        query = query.join(Institution).filter(
            Application.reference_number.ilike(f"%{search}%") |
            Institution.name.ilike(f"%{search}%") |
            Institution.aicte_id.ilike(f"%{search}%")
        )

    apps = query.order_by(Application.created_at.desc()).offset(skip).limit(limit).all()

    # Build detailed output
    results = []
    for app in apps:
        doc_count = db.query(Document).filter(Document.application_id == app.id).count()
        findings = db.query(ValidationFinding).filter(ValidationFinding.application_id == app.id).all()
        finding_count = len(findings)
        open_findings = sum(1 for f in findings if f.review_status != "closed")
        critical_findings = sum(1 for f in findings if f.severity == FindingSeverity.CRITICAL)

        inst_out = InstitutionOut.model_validate(app.institution) if app.institution else None
        cat_out = CategoryOut.model_validate(app.category) if app.category else None

        results.append(ApplicationDetail(
            id=app.id,
            reference_number=app.reference_number,
            institution_id=app.institution_id,
            category_id=app.category_id,
            academic_year=app.academic_year,
            status=app.status.value,
            validation_status=app.validation_status.value if app.validation_status else "not_checked",
            created_by_id=app.created_by_id,
            assigned_reviewer_id=app.assigned_reviewer_id,
            submitted_at=app.submitted_at,
            last_validated_at=app.last_validated_at,
            next_action=app.next_action,
            reviewer_notes=app.reviewer_notes,
            is_demo=app.is_demo,
            created_at=app.created_at,
            updated_at=app.updated_at,
            institution=inst_out,
            category=cat_out,
            document_count=doc_count,
            finding_count=finding_count,
            open_findings=open_findings,
            critical_findings=critical_findings,
        ))

    return results


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ensure institution matches for institution users
    inst_id = body.institution_id
    if current_user.role == UserRole.INSTITUTION and current_user.institution_id:
        inst_id = current_user.institution_id

    ref_num = _gen_ref_number(body.academic_year or "2024")

    new_app = Application(
        reference_number=ref_num,
        institution_id=inst_id,
        category_id=body.category_id,
        academic_year=body.academic_year or "2024-25",
        status=ApplicationStatus.DRAFT,
        validation_status=ValidationStatus.NOT_CHECKED,
        created_by_id=current_user.id,
        is_demo=False,
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=new_app.id,
        event_type="application_created",
        entity_type="application",
        entity_id=new_app.id,
        description=f"Application {new_app.reference_number} created.",
    ))
    db.commit()

    return new_app


@router.get("/{application_id}", response_model=ApplicationDetail)
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == UserRole.INSTITUTION:
        if current_user.institution_id and app.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this application")

    doc_count = db.query(Document).filter(Document.application_id == app.id).count()
    findings = db.query(ValidationFinding).filter(ValidationFinding.application_id == app.id).all()
    finding_count = len(findings)
    open_findings = sum(1 for f in findings if f.review_status != "closed")
    critical_findings = sum(1 for f in findings if f.severity == FindingSeverity.CRITICAL)

    inst_out = InstitutionOut.model_validate(app.institution) if app.institution else None
    cat_out = CategoryOut.model_validate(app.category) if app.category else None

    return ApplicationDetail(
        id=app.id,
        reference_number=app.reference_number,
        institution_id=app.institution_id,
        category_id=app.category_id,
        academic_year=app.academic_year,
        status=app.status.value,
        validation_status=app.validation_status.value if app.validation_status else "not_checked",
        created_by_id=app.created_by_id,
        assigned_reviewer_id=app.assigned_reviewer_id,
        submitted_at=app.submitted_at,
        last_validated_at=app.last_validated_at,
        next_action=app.next_action,
        reviewer_notes=app.reviewer_notes,
        is_demo=app.is_demo,
        created_at=app.created_at,
        updated_at=app.updated_at,
        institution=inst_out,
        category=cat_out,
        document_count=doc_count,
        finding_count=finding_count,
        open_findings=open_findings,
        critical_findings=critical_findings,
    )


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: str,
    body: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == UserRole.INSTITUTION:
        if app.created_by_id != current_user.id and app.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this application")
        if body.assigned_reviewer_id is not None or body.reviewer_notes is not None:
            raise HTTPException(status_code=403, detail="Institutions cannot modify reviewer assignments or notes")
        if body.status and body.status not in ["draft", "submitted"]:
            raise HTTPException(status_code=403, detail="Institutions cannot set review outcome status")

    if body.status:
        try:
            app.status = ApplicationStatus(body.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    if body.assigned_reviewer_id is not None:
        app.assigned_reviewer_id = body.assigned_reviewer_id
    if body.next_action is not None:
        app.next_action = body.next_action
    if body.reviewer_notes is not None:
        app.reviewer_notes = body.reviewer_notes

    app.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(app)

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=app.id,
        event_type="application_updated",
        entity_type="application",
        entity_id=app.id,
        description=f"Application {app.reference_number} updated by {current_user.email}.",
    ))
    db.commit()

    return app


@router.post("/{application_id}/submit", response_model=ApplicationOut)
def submit_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = ApplicationStatus.SUBMITTED
    app.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(app)

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=app.id,
        event_type="application_submitted",
        entity_type="application",
        entity_id=app.id,
        description=f"Application {app.reference_number} officially submitted.",
    ))
    db.commit()

    return app

"""Reports API: Scrutiny and Deficiency report generation"""
from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import (
    Application, AuditEvent, FindingSeverity, Report, RuleSet,
    User, ValidationFinding
)
from app.schemas.schemas import ReportDetail, ReportOut

router = APIRouter(tags=["Reports"])

REPORT_DISCLAIMER = (
    "RuleTrace AI is an assistive decision-support platform designed to accelerate scrutiny "
    "under the AICTE Approval Process Handbook (APH 2024-2027). The findings, observations, and "
    "classifications generated herein do not constitute a final regulatory decision or legal approval. "
    "Final approval or rejection authority rests exclusively with the designated Scrutiny Committee / "
    "Hearing Committee and Competent Authority of AICTE."
)


@router.post("/applications/{application_id}/reports/generate", response_model=ReportDetail)
def generate_scrutiny_report(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    findings = db.query(ValidationFinding).filter(ValidationFinding.application_id == application_id).all()
    rule_set = db.query(RuleSet).filter(RuleSet.is_active == True).first()

    crit_count = sum(1 for f in findings if f.severity == FindingSeverity.CRITICAL)
    high_count = sum(1 for f in findings if f.severity == FindingSeverity.HIGH)
    med_count = sum(1 for f in findings if f.severity == FindingSeverity.MEDIUM)
    low_count = sum(1 for f in findings if f.severity == FindingSeverity.LOW)
    false_pos = sum(1 for f in findings if f.is_false_positive)

    findings_data = []
    for f in findings:
        findings_data.append({
            "id": f.id,
            "title": f.title,
            "description": f.description,
            "finding_type": f.finding_type.value if hasattr(f.finding_type, "value") else str(f.finding_type),
            "severity": f.severity.value if hasattr(f.severity, "value") else str(f.severity),
            "status": f.status.value if hasattr(f.status, "value") else str(f.status),
            "handbook_ref": f.handbook_ref,
            "evidence_field": f.evidence_field,
            "evidence_value": f.evidence_value,
            "recommended_action": f.recommended_action,
            "review_status": f.review_status,
            "reviewer_notes": f.reviewer_notes,
        })

    report_content = {
        "report_id": f"REP-{app.reference_number}-{datetime.now().strftime('%Y%m%d%H%M')}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "application_reference": app.reference_number,
        "academic_year": app.academic_year,
        "institution": {
            "name": app.institution.name if app.institution else "Unknown",
            "aicte_id": app.institution.aicte_id if app.institution else "N/A",
            "state": app.institution.state if app.institution else "N/A",
            "city": app.institution.city if app.institution else "N/A",
            "affiliating_university": app.institution.affiliating_university if app.institution else "N/A",
        },
        "category": {
            "name": app.category.name if app.category else "Standard Scrutiny",
            "code": app.category.code if app.category else "N/A",
        },
        "statistics": {
            "total_findings": len(findings),
            "critical_deficiencies": crit_count,
            "high_severity": high_count,
            "medium_severity": med_count,
            "low_severity": low_count,
            "false_positives_cleared": false_pos,
        },
        "recommendation": (
            "DEFICIENCIES REQUIRE RECTIFICATION" if crit_count > 0 
            else ("ELIGIBLE FOR PROCEEDING SUBJECT TO MINOR CLARIFICATIONS" if high_count > 0 
                  else "ALL MANDATORY SCRUTINY CHECKS SATISFIED")
        ),
        "findings": findings_data,
        "disclaimer": REPORT_DISCLAIMER,
    }

    report = Report(
        application_id=app.id,
        generated_by_id=current_user.id,
        rule_set_id=rule_set.id if rule_set else None,
        title=f"AICTE Scrutiny & Deficiency Report — {app.reference_number}",
        report_type="scrutiny_deficiency",
        content_json=json.dumps(report_content),
        disclaimer=REPORT_DISCLAIMER,
        is_final=False,
    )
    db.add(report)

    db.add(AuditEvent(
        user_id=current_user.id,
        application_id=app.id,
        event_type="report_generated",
        entity_type="report",
        entity_id=report.id,
        description=f"Scrutiny report generated for {app.reference_number}.",
    ))
    db.commit()
    db.refresh(report)

    return ReportDetail(
        id=report.id,
        application_id=report.application_id,
        title=report.title,
        report_type=report.report_type,
        disclaimer=report.disclaimer,
        is_final=report.is_final,
        generated_at=report.generated_at,
        content=report_content,
    )


@router.get("/applications/{application_id}/reports", response_model=List[ReportOut])
def list_application_reports(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Report)
        .filter(Report.application_id == application_id)
        .order_by(Report.generated_at.desc())
        .all()
    )


@router.get("/reports/{report_id}", response_model=ReportDetail)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    content = None
    if report.content_json:
        try:
            content = json.loads(report.content_json)
        except Exception:
            content = {}

    return ReportDetail(
        id=report.id,
        application_id=report.application_id,
        title=report.title,
        report_type=report.report_type,
        disclaimer=report.disclaimer,
        is_final=report.is_final,
        generated_at=report.generated_at,
        content=content,
    )

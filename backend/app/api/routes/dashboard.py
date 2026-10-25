"""Dashboard analytics and scrutiny KPI routes"""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import (
    Application, ApplicationStatus, AuditEvent, ExternalConnector, FindingSeverity,
    FindingType, Institution, Notification, ReviewerAction, Rule,
    User, UserRole, ValidationFinding, ValidationStatus
)
from app.schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app_query = db.query(Application)
    finding_query = db.query(ValidationFinding)

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_metrics: Dict[str, Any] = {}

    if current_user.role == UserRole.INSTITUTION:
        # Scoped to current institution
        if current_user.institution_id:
            app_query = app_query.filter(Application.institution_id == current_user.institution_id)
        else:
            app_query = app_query.filter(Application.created_by_id == current_user.id)
        
        apps = app_query.all()
        app_ids = [a.id for a in apps]
        finding_query = finding_query.filter(ValidationFinding.application_id.in_(app_ids)) if app_ids else finding_query.filter(ValidationFinding.id == "none")

        my_apps_count = len(apps)
        drafts_count = sum(1 for a in apps if a.status == ApplicationStatus.DRAFT)
        needs_correction_count = sum(1 for a in apps if a.status == ApplicationStatus.DEFICIENCY_RAISED or (a.next_action and "correct" in a.next_action.lower()))
        awaiting_review_count = sum(1 for a in apps if a.status in [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.COMPLIANCE_REVIEW])

        # Institution-specific open issues
        own_findings = finding_query.filter(ValidationFinding.review_status != "closed").all()
        issues_summary = []
        for f in own_findings[:8]:
            issues_summary.append({
                "id": f.id,
                "title": f.title,
                "severity": f.severity.value if hasattr(f.severity, "value") else str(f.severity),
                "handbook_ref": f.handbook_ref or "APH §2",
                "recommended_action": f.recommended_action,
                "application_id": f.application_id,
            })

        role_metrics = {
            "my_applications": my_apps_count,
            "drafts_in_progress": drafts_count,
            "needs_correction": needs_correction_count,
            "awaiting_review": awaiting_review_count,
            "issues_requiring_attention": issues_summary,
        }

    elif current_user.role == UserRole.REVIEWER:
        # Scrutiny Officer scoped metrics
        assigned_apps = db.query(Application).filter(Application.assigned_reviewer_id == current_user.id).all()
        assigned_count = len(assigned_apps)
        
        # If no explicit assignment, count actionable applications currently in scrutiny queue
        queue_apps = db.query(Application).filter(
            Application.status.in_([
                ApplicationStatus.SUBMITTED,
                ApplicationStatus.UNDER_REVIEW,
                ApplicationStatus.COMPLIANCE_REVIEW,
                ApplicationStatus.DEFICIENCY_RAISED,
            ])
        ).all()
        
        awaiting_review_count = sum(1 for a in queue_apps if a.status in [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW])
        returned_resubmitted_count = sum(1 for a in queue_apps if a.status == ApplicationStatus.DEFICIENCY_RAISED)

        # High priority findings across actionable queue
        queue_app_ids = [a.id for a in queue_apps]
        high_priority_findings = db.query(ValidationFinding).filter(
            ValidationFinding.application_id.in_(queue_app_ids),
            ValidationFinding.severity.in_([FindingSeverity.CRITICAL, FindingSeverity.HIGH]),
            ValidationFinding.review_status != "closed"
        ).count() if queue_app_ids else 0

        # Actions performed today by this reviewer
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        reviewed_today = db.query(ReviewerAction).filter(
            ReviewerAction.reviewer_id == current_user.id,
            ReviewerAction.created_at >= today_start
        ).count()

        role_metrics = {
            "assigned_to_me": assigned_count if assigned_count > 0 else len(queue_apps),
            "awaiting_review": awaiting_review_count,
            "high_priority_findings": high_priority_findings,
            "returned_resubmitted": returned_resubmitted_count,
            "reviewed_today": reviewed_today,
            "queue_size": len(queue_apps),
        }

    elif current_user.role == UserRole.ADMINISTRATOR:
        # Administrator overview metrics
        total_apps = db.query(Application).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        rules_awaiting_review = db.query(Rule).filter(Rule.status == "draft").count()
        configured_connectors = db.query(ExternalConnector).filter(ExternalConnector.is_configured == True).count()
        total_connectors = db.query(ExternalConnector).count()

        role_metrics = {
            "total_applications": total_apps,
            "active_users": active_users,
            "rules_awaiting_review": rules_awaiting_review,
            "configured_connectors": configured_connectors,
            "total_connectors": total_connectors,
        }

    elif current_user.role == UserRole.AUDIT_VIEWER:
        # Audit Observer metrics
        total_events = db.query(AuditEvent).count()
        lifecycle_events = db.query(AuditEvent).filter(
            (AuditEvent.entity_type.in_(["application", "document"])) |
            (AuditEvent.event_type.ilike("application%")) |
            (AuditEvent.event_type.ilike("document%"))
        ).count()
        reviewer_events = db.query(AuditEvent).filter(
            (AuditEvent.event_type.in_(["finding_reviewed", "report_generated", "scrutiny_decision"])) |
            (AuditEvent.entity_type == "validation_finding")
        ).count()
        rule_system_events = db.query(AuditEvent).filter(
            (AuditEvent.event_type.in_(["rule_updated", "document_verified", "user_login"])) |
            (AuditEvent.entity_type.in_(["rule", "verification_attempt", "user"]))
        ).count()

        role_metrics = {
            "total_events": total_events,
            "lifecycle_events": lifecycle_events,
            "reviewer_events": reviewer_events,
            "rule_system_events": rule_system_events,
        }

    apps = app_query.all()
    total_apps = len(apps) if current_user.role == UserRole.INSTITUTION else db.query(Application).count()

    status_counts = {}
    for a in apps:
        status_str = a.status.value if hasattr(a.status, "value") else str(a.status)
        status_counts[status_str] = status_counts.get(status_str, 0) + 1

    findings = finding_query.all()
    total_findings = len(findings)
    critical_findings = sum(1 for f in findings if f.severity == FindingSeverity.CRITICAL)

    missing_docs = sum(1 for f in findings if f.finding_type == FindingType.MISSING_DOCUMENT)
    expired_docs = sum(1 for f in findings if f.finding_type == FindingType.EXPIRED_DOCUMENT)
    expiry_approaching = sum(1 for f in findings if f.finding_type == FindingType.EXPIRY_APPROACHING)
    mismatches = sum(1 for f in findings if f.finding_type == FindingType.FIELD_MISMATCH)
    anomaly_flags = sum(1 for f in findings if f.finding_type == FindingType.ANOMALY_FLAG)
    duplicates = sum(1 for f in findings if f.finding_type == FindingType.DUPLICATE_DETECTED)
    verif_pending = sum(1 for f in findings if f.finding_type == FindingType.VERIFICATION_PENDING)
    review_queue_size = sum(1 for f in findings if f.review_status != "closed")

    unread_notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    recent = []
    for a in apps[:6]:
        recent.append({
            "id": a.id,
            "reference_number": a.reference_number,
            "institution_name": a.institution.name if a.institution else "Unknown Institution",
            "category_name": a.category.name if a.category else "General Approval",
            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            "validation_status": a.validation_status.value if a.validation_status and hasattr(a.validation_status, "value") else str(a.validation_status),
            "created_at": a.created_at.isoformat(),
        })

    return DashboardStats(
        total_applications=total_apps,
        applications_by_status=status_counts,
        total_findings=total_findings,
        critical_findings=critical_findings,
        missing_document_count=missing_docs,
        expired_document_count=expired_docs,
        expiry_approaching_count=expiry_approaching,
        mismatch_count=mismatches,
        anomaly_flag_count=anomaly_flags,
        duplicate_count=duplicates,
        verification_pending=verif_pending,
        review_queue_size=review_queue_size,
        unread_notifications=unread_notifs,
        recent_applications=recent,
        role=role_str,
        role_metrics=role_metrics,
    )


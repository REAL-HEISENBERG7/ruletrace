"""
RuleTrace AI — SQLAlchemy ORM Models

All entities share this module for simplicity.  In a larger project each
entity would live in its own module; they are consolidated here for clarity.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


# ─────────────────────────────── helpers ─────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ─────────────────────────────── enums ───────────────────────────────────────

class UserRole(str, enum.Enum):
    INSTITUTION = "institution"
    REVIEWER = "reviewer"
    ADMINISTRATOR = "administrator"
    AUDIT_VIEWER = "audit_viewer"


class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    DEFICIENCY_RAISED = "deficiency_raised"
    PENDING_VERIFICATION = "pending_verification"
    COMPLIANCE_REVIEW = "compliance_review"
    COMPLETE = "complete"
    REJECTED = "rejected"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    QUEUED = "queued"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    NEEDS_CORRECTION = "needs_correction"
    FAILED = "failed"
    VERIFIED = "verified"


class ValidationStatus(str, enum.Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    NOT_CHECKED = "not_checked"
    PENDING_VERIFICATION = "pending_verification"
    MANUAL_REVIEW_REQUIRED = "manual_review_required"


class FindingSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingType(str, enum.Enum):
    MISSING_DOCUMENT = "missing_document"
    EXPIRED_DOCUMENT = "expired_document"
    EXPIRY_APPROACHING = "expiry_approaching"
    FIELD_MISMATCH = "field_mismatch"
    DUPLICATE_DETECTED = "duplicate_detected"
    ANOMALY_FLAG = "anomaly_flag"
    COMPLETENESS_CHECK = "completeness_check"
    CONSISTENCY_CHECK = "consistency_check"
    VERIFICATION_PENDING = "verification_pending"
    INFRASTRUCTURE_GAP = "infrastructure_gap"


class VerificationStatus(str, enum.Enum):
    VERIFIED = "verified"
    MISMATCH = "mismatch"
    EXPIRED = "expired"
    PENDING = "pending"
    SOURCE_UNAVAILABLE = "source_unavailable"
    NOT_CONFIGURED = "not_configured"
    MANUAL_REVIEW_REQUIRED = "manual_review_required"
    INCONCLUSIVE = "inconclusive"


class RuleStatus(str, enum.Enum):
    DRAFT = "draft"
    REVIEWED = "reviewed"
    ACTIVE = "active"
    RETIRED = "retired"


class AlertSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ReviewAction(str, enum.Enum):
    CONFIRMED = "confirmed"
    CORRECTED = "corrected"
    FALSE_POSITIVE = "false_positive"
    PENDING_MORE_INFO = "pending_more_info"
    VERIFICATION_PENDING = "verification_pending"
    INCONCLUSIVE = "inconclusive"


# ─────────────────────────────── models ─────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.INSTITUTION)
    is_active = Column(Boolean, default=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=True)
    created_at = Column(DateTime, default=_now)
    last_login = Column(DateTime, nullable=True)

    institution = relationship("Institution", back_populates="users", foreign_keys=[institution_id])
    applications = relationship("Application", back_populates="created_by_user", foreign_keys="Application.created_by_id")
    audit_events = relationship("AuditEvent", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    reviewer_actions = relationship("ReviewerAction", back_populates="reviewer")


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    aicte_id = Column(String, unique=True, nullable=True, index=True)
    institution_type = Column(String, nullable=True)  # Government, Private, Aided, etc.
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    city = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    pincode = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    affiliating_university = Column(String, nullable=True)
    established_year = Column(Integer, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    users = relationship("User", back_populates="institution", foreign_keys="User.institution_id")
    applications = relationship("Application", back_populates="institution")


class ApplicationCategory(Base):
    __tablename__ = "application_categories"

    id = Column(String, primary_key=True, default=_uuid)
    code = Column(String, unique=True, nullable=False)  # e.g., "EOA_SELF_DISCLOSURE"
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    handbook_reference = Column(String, nullable=True)  # e.g., "Chapter II, Clause 2.5"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)

    applications = relationship("Application", back_populates="category")
    checklist_items = relationship("ChecklistTemplate", back_populates="category")
    rules = relationship("Rule", back_populates="category")


class ChecklistTemplate(Base):
    """Configurable checklist items required for each application category."""
    __tablename__ = "checklist_templates"

    id = Column(String, primary_key=True, default=_uuid)
    category_id = Column(String, ForeignKey("application_categories.id"), nullable=False)
    document_type_code = Column(String, nullable=False)  # e.g., "AFFIDAVIT_2"
    document_type_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_mandatory = Column(Boolean, default=True)
    validity_days = Column(Integer, nullable=True)  # None = no expiry check
    handbook_reference = Column(String, nullable=True)  # APH clause ref
    annexure_reference = Column(String, nullable=True)  # e.g., "Annexure 2, Item 2.1(i)"
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)

    category = relationship("ApplicationCategory", back_populates="checklist_items")


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=_uuid)
    reference_number = Column(String, unique=True, nullable=False, index=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    category_id = Column(String, ForeignKey("application_categories.id"), nullable=False)
    academic_year = Column(String, nullable=True)  # e.g., "2024-25"
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.DRAFT, nullable=False)
    validation_status = Column(Enum(ValidationStatus), default=ValidationStatus.NOT_CHECKED)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_reviewer_id = Column(String, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    last_validated_at = Column(DateTime, nullable=True)
    next_action = Column(Text, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    institution = relationship("Institution", back_populates="applications")
    category = relationship("ApplicationCategory", back_populates="applications")
    created_by_user = relationship("User", back_populates="applications", foreign_keys=[created_by_id])
    assigned_reviewer = relationship("User", foreign_keys=[assigned_reviewer_id])
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    findings = relationship("ValidationFinding", back_populates="application", cascade="all, delete-orphan")
    validation_runs = relationship("ValidationRun", back_populates="application", cascade="all, delete-orphan")
    compliance_observations = relationship("ComplianceObservation", back_populates="application", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="application")
    notifications = relationship("Notification", back_populates="application")
    reports = relationship("Report", back_populates="application", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    document_type_code = Column(String, nullable=False)
    document_type_name = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    file_hash = Column(String, nullable=True, index=True)  # SHA-256 for duplicate detection
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    page_count = Column(Integer, nullable=True)
    has_digital_text = Column(Boolean, nullable=True)  # True = digital PDF; False = scanned
    extraction_method = Column(String, nullable=True)  # "digital_text" | "tesseract_ocr" | "none"
    extracted_text = Column(Text, nullable=True)
    classification_result = Column(String, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    issue_date = Column(DateTime, nullable=True)
    is_demo = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=_now)
    processed_at = Column(DateTime, nullable=True)

    application = relationship("Application", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
    findings = relationship("ValidationFinding", back_populates="document", foreign_keys="[ValidationFinding.document_id]")
    verification_attempts = relationship("VerificationAttempt", back_populates="document", cascade="all, delete-orphan")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(String, primary_key=True, default=_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    field_name = Column(String, nullable=False)  # e.g., "institution_name", "expiry_date"
    field_label = Column(String, nullable=False)  # Human-readable label
    extracted_value = Column(Text, nullable=True)
    corrected_value = Column(Text, nullable=True)  # Set by reviewer
    effective_value = Column(Text, nullable=True)  # = corrected_value or extracted_value
    confidence = Column(Float, nullable=True)  # 0.0 – 1.0 or None
    confidence_label = Column(String, nullable=True)  # "high"|"medium"|"low"|"unavailable"|"heuristic"
    source_page = Column(Integer, nullable=True)
    bounding_box = Column(Text, nullable=True)  # JSON string if available
    is_manually_corrected = Column(Boolean, default=False)
    correction_note = Column(Text, nullable=True)
    corrected_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    corrected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)

    document = relationship("Document", back_populates="extracted_fields")
    corrected_by = relationship("User", foreign_keys=[corrected_by_id])


class RuleSet(Base):
    __tablename__ = "rule_sets"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)  # e.g., "2024-27-v1"
    source_document = Column(String, nullable=True)  # "AICTE APH 2024-27"
    effective_from = Column(DateTime, nullable=True)
    effective_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)

    rules = relationship("Rule", back_populates="rule_set")
    validation_runs = relationship("ValidationRun", back_populates="rule_set")


class Rule(Base):
    __tablename__ = "rules"

    id = Column(String, primary_key=True, default=_uuid)
    rule_set_id = Column(String, ForeignKey("rule_sets.id"), nullable=False)
    category_id = Column(String, ForeignKey("application_categories.id"), nullable=True)  # None = all categories
    code = Column(String, nullable=False, index=True)  # e.g., "EOA-2.3.4-AFF2"
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # Handbook traceability
    handbook_version = Column(String, nullable=True)
    chapter = Column(String, nullable=True)
    clause = Column(String, nullable=True)  # e.g., "2.3.4"
    subclause = Column(String, nullable=True)
    annexure = Column(String, nullable=True)
    pdf_page = Column(Integer, nullable=True)
    printed_page = Column(String, nullable=True)
    source_excerpt = Column(Text, nullable=True)
    # Validation config
    check_type = Column(String, nullable=False)  # e.g., "document_required", "expiry_check"
    document_type_code = Column(String, nullable=True)  # which doc type this applies to
    field_name = Column(String, nullable=True)
    parameters = Column(Text, nullable=True)  # JSON string for flexible config
    severity = Column(Enum(FindingSeverity), default=FindingSeverity.HIGH)
    recommended_action = Column(Text, nullable=True)
    status = Column(Enum(RuleStatus), default=RuleStatus.ACTIVE)
    review_notes = Column(Text, nullable=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    rule_set = relationship("RuleSet", back_populates="rules")
    category = relationship("ApplicationCategory", back_populates="rules")
    created_by = relationship("User", foreign_keys=[created_by_id])
    findings = relationship("ValidationFinding", back_populates="rule")


class ValidationRun(Base):
    __tablename__ = "validation_runs"

    id = Column(String, primary_key=True, default=_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    rule_set_id = Column(String, ForeignKey("rule_sets.id"), nullable=False)
    triggered_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)
    total_checks = Column(Integer, default=0)
    passed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    warnings = Column(Integer, default=0)
    not_checked = Column(Integer, default=0)
    summary = Column(Text, nullable=True)

    application = relationship("Application", back_populates="validation_runs")
    rule_set = relationship("RuleSet", back_populates="validation_runs")
    findings = relationship("ValidationFinding", back_populates="validation_run")


class ValidationFinding(Base):
    __tablename__ = "validation_findings"

    id = Column(String, primary_key=True, default=_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    validation_run_id = Column(String, ForeignKey("validation_runs.id"), nullable=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    rule_id = Column(String, ForeignKey("rules.id"), nullable=True)
    finding_type = Column(Enum(FindingType), nullable=False)
    status = Column(Enum(ValidationStatus), default=ValidationStatus.FAIL)
    severity = Column(Enum(FindingSeverity), default=FindingSeverity.HIGH)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    # Evidence chain
    evidence_field = Column(String, nullable=True)       # field_name involved
    evidence_value = Column(Text, nullable=True)         # extracted or corrected value
    evidence_page = Column(Integer, nullable=True)
    expected_value = Column(Text, nullable=True)         # what was expected per rule
    compared_with_doc_id = Column(String, ForeignKey("documents.id"), nullable=True)
    compared_field = Column(String, nullable=True)
    compared_value = Column(Text, nullable=True)
    # Rule traceability
    handbook_ref = Column(String, nullable=True)        # short human-readable ref
    recommended_action = Column(Text, nullable=True)
    # Review
    review_status = Column(String, nullable=True)       # "open", "reviewed", "closed"
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    is_false_positive = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    application = relationship("Application", back_populates="findings")
    document = relationship("Document", back_populates="findings", foreign_keys=[document_id])
    compared_with_doc = relationship("Document", foreign_keys=[compared_with_doc_id])
    rule = relationship("Rule", back_populates="findings")
    validation_run = relationship("ValidationRun", back_populates="findings")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    reviewer_actions = relationship("ReviewerAction", back_populates="finding")


class VerificationAttempt(Base):
    __tablename__ = "verification_attempts"

    id = Column(String, primary_key=True, default=_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    method = Column(String, nullable=False)  # "qr_code", "digital_signature", "manual", "api"
    source_name = Column(String, nullable=True)  # "AICTE Portal", "DigiLocker", etc.
    status = Column(Enum(VerificationStatus), default=VerificationStatus.NOT_CONFIGURED)
    submitted_value = Column(Text, nullable=True)
    returned_value = Column(Text, nullable=True)
    error_reason = Column(Text, nullable=True)
    verified_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)

    document = relationship("Document", back_populates="verification_attempts")
    verified_by = relationship("User", foreign_keys=[verified_by_id])


class ComplianceObservation(Base):
    __tablename__ = "compliance_observations"

    id = Column(String, primary_key=True, default=_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    category = Column(String, nullable=False)  # "infrastructure", "faculty", "financial", etc.
    observation = Column(Text, nullable=False)
    status = Column(Enum(ValidationStatus), default=ValidationStatus.NOT_CHECKED)
    severity = Column(Enum(FindingSeverity), default=FindingSeverity.MEDIUM)
    handbook_ref = Column(String, nullable=True)
    evidence = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)

    application = relationship("Application", back_populates="compliance_observations")
    document = relationship("Document", foreign_keys=[document_id])


class ReviewerAction(Base):
    __tablename__ = "reviewer_actions"

    id = Column(String, primary_key=True, default=_uuid)
    finding_id = Column(String, ForeignKey("validation_findings.id"), nullable=False)
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(Enum(ReviewAction), nullable=False)
    notes = Column(Text, nullable=True)
    corrected_field = Column(String, nullable=True)
    corrected_value = Column(Text, nullable=True)
    previous_value = Column(Text, nullable=True)
    triggered_revalidation = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    finding = relationship("ValidationFinding", back_populates="reviewer_actions")
    reviewer = relationship("User", back_populates="reviewer_actions")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    application_id = Column(String, ForeignKey("applications.id"), nullable=True)
    finding_id = Column(String, ForeignKey("validation_findings.id"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.MEDIUM)
    is_read = Column(Boolean, default=False)
    action_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now)
    read_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="notifications")
    application = relationship("Application", back_populates="notifications")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    application_id = Column(String, ForeignKey("applications.id"), nullable=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    event_type = Column(String, nullable=False)  # e.g., "document_uploaded", "field_corrected"
    entity_type = Column(String, nullable=True)  # "application", "document", "finding"
    entity_id = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    before_state = Column(Text, nullable=True)  # JSON
    after_state = Column(Text, nullable=True)   # JSON
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="audit_events")
    application = relationship("Application", back_populates="audit_events")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    generated_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    rule_set_id = Column(String, ForeignKey("rule_sets.id"), nullable=True)
    title = Column(String, nullable=False)
    report_type = Column(String, default="preliminary_validation")
    content_json = Column(Text, nullable=True)  # full report data as JSON
    disclaimer = Column(Text, nullable=True)
    is_final = Column(Boolean, default=False)
    generated_at = Column(DateTime, default=_now)

    application = relationship("Application", back_populates="reports")
    generated_by = relationship("User", foreign_keys=[generated_by_id])
    rule_set = relationship("RuleSet", foreign_keys=[rule_set_id])


class ExternalConnector(Base):
    """Configuration for external verification source integrations."""
    __tablename__ = "external_connectors"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)  # e.g., "AICTE Portal", "DigiLocker"
    connector_type = Column(String, nullable=False)  # "api", "qr", "digital_sig", "manual"
    is_configured = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=True)
    endpoint_url = Column(String, nullable=True)
    document_type_codes = Column(Text, nullable=True)  # JSON list of applicable doc types
    description = Column(Text, nullable=True)
    status_note = Column(Text, nullable=True)  # "Not configured — demo mode"
    created_at = Column(DateTime, default=_now)

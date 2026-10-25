"""
RuleTrace AI — Pydantic schemas (request/response models)
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, field_validator


# ─────────────────────────────── Auth ────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    institution_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str
    institution_id: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None



# ─────────────────────────────── Institution ──────────────────────────────────

class InstitutionOut(BaseModel):
    id: str
    name: str
    aicte_id: Optional[str] = None
    institution_type: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    affiliating_university: Optional[str] = None
    established_year: Optional[int] = None
    is_demo: bool

    model_config = {"from_attributes": True}


# ─────────────────────────────── Application Category ────────────────────────

class CategoryOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    handbook_reference: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class ChecklistItemOut(BaseModel):
    id: str
    document_type_code: str
    document_type_name: str
    description: Optional[str] = None
    is_mandatory: bool
    validity_days: Optional[int] = None
    handbook_reference: Optional[str] = None
    annexure_reference: Optional[str] = None
    sort_order: int

    model_config = {"from_attributes": True}


# ─────────────────────────────── Application ─────────────────────────────────

class ApplicationCreate(BaseModel):
    institution_id: str
    category_id: str
    academic_year: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    assigned_reviewer_id: Optional[str] = None
    next_action: Optional[str] = None
    reviewer_notes: Optional[str] = None


class ApplicationOut(BaseModel):
    id: str
    reference_number: str
    institution_id: str
    category_id: str
    academic_year: Optional[str] = None
    status: str
    validation_status: str
    created_by_id: str
    assigned_reviewer_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    last_validated_at: Optional[datetime] = None
    next_action: Optional[str] = None
    reviewer_notes: Optional[str] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApplicationDetail(ApplicationOut):
    institution: Optional[InstitutionOut] = None
    category: Optional[CategoryOut] = None
    document_count: int = 0
    finding_count: int = 0
    open_findings: int = 0
    critical_findings: int = 0

    model_config = {"from_attributes": True}


# ─────────────────────────────── Document ────────────────────────────────────

class DocumentOut(BaseModel):
    id: str
    application_id: str
    document_type_code: str
    document_type_name: str
    original_filename: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    status: str
    page_count: Optional[int] = None
    has_digital_text: Optional[bool] = None
    extraction_method: Optional[str] = None
    classification_result: Optional[str] = None
    expiry_date: Optional[datetime] = None
    issue_date: Optional[datetime] = None
    is_demo: bool
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ExtractedFieldOut(BaseModel):
    id: str
    document_id: str
    field_name: str
    field_label: str
    extracted_value: Optional[str] = None
    corrected_value: Optional[str] = None
    effective_value: Optional[str] = None
    confidence_label: Optional[str] = None
    source_page: Optional[int] = None
    is_manually_corrected: bool
    correction_note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FieldCorrectionRequest(BaseModel):
    corrected_value: str
    correction_note: Optional[str] = None


# ─────────────────────────────── Validation ──────────────────────────────────

class ValidationRunOut(BaseModel):
    id: str
    application_id: str
    rule_set_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_checks: int
    passed: int
    failed: int
    warnings: int
    not_checked: int
    summary: Optional[str] = None

    model_config = {"from_attributes": True}


class FindingOut(BaseModel):
    id: str
    application_id: str
    validation_run_id: Optional[str] = None
    document_id: Optional[str] = None
    rule_id: Optional[str] = None
    finding_type: str
    status: str
    severity: str
    title: str
    description: str
    evidence_field: Optional[str] = None
    evidence_value: Optional[str] = None
    evidence_page: Optional[int] = None
    expected_value: Optional[str] = None
    compared_with_doc_id: Optional[str] = None
    compared_field: Optional[str] = None
    compared_value: Optional[str] = None
    handbook_ref: Optional[str] = None
    recommended_action: Optional[str] = None
    review_status: Optional[str] = None
    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    is_false_positive: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReviewActionRequest(BaseModel):
    action: str  # "confirmed", "corrected", "false_positive", "pending_more_info", etc.
    notes: Optional[str] = None
    corrected_field: Optional[str] = None
    corrected_value: Optional[str] = None


# ─────────────────────────────── Rule ────────────────────────────────────────

class RuleOut(BaseModel):
    id: str
    rule_set_id: str
    category_id: Optional[str] = None
    code: str
    name: str
    description: Optional[str] = None
    handbook_version: Optional[str] = None
    chapter: Optional[str] = None
    clause: Optional[str] = None
    annexure: Optional[str] = None
    pdf_page: Optional[int] = None
    printed_page: Optional[str] = None
    source_excerpt: Optional[str] = None
    check_type: str
    document_type_code: Optional[str] = None
    severity: str
    recommended_action: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RuleSetOut(BaseModel):
    id: str
    name: str
    version: str
    source_document: Optional[str] = None
    is_active: bool
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────── Verification ────────────────────────────────

class VerificationAttemptOut(BaseModel):
    id: str
    document_id: str
    method: str
    source_name: Optional[str] = None
    status: str
    submitted_value: Optional[str] = None
    returned_value: Optional[str] = None
    error_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────── Notifications ───────────────────────────────

class NotificationOut(BaseModel):
    id: str
    application_id: Optional[str] = None
    finding_id: Optional[str] = None
    title: str
    message: str
    severity: str
    is_read: bool
    action_url: Optional[str] = None
    created_at: datetime
    read_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────── Dashboard ───────────────────────────────────

class RuleStatusUpdate(BaseModel):
    status: str  # "active", "draft", "deprecated"
    review_notes: Optional[str] = None


class DashboardStats(BaseModel):
    total_applications: int
    applications_by_status: Dict[str, int]
    total_findings: int
    critical_findings: int
    missing_document_count: int
    expired_document_count: int
    expiry_approaching_count: int
    mismatch_count: int
    anomaly_flag_count: int
    duplicate_count: int
    verification_pending: int
    review_queue_size: int
    unread_notifications: int
    recent_applications: List[Dict[str, Any]] = []
    role: Optional[str] = None
    role_metrics: Optional[Dict[str, Any]] = None



# ─────────────────────────────── Report ──────────────────────────────────────

class ReportOut(BaseModel):
    id: str
    application_id: str
    title: str
    report_type: str
    disclaimer: Optional[str] = None
    is_final: bool
    generated_at: datetime

    model_config = {"from_attributes": True}


class ReportDetail(ReportOut):
    content: Optional[Dict[str, Any]] = None


# ─────────────────────────────── Audit ───────────────────────────────────────

class AuditEventOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    application_id: Optional[str] = None
    document_id: Optional[str] = None
    event_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    description: str
    before_state: Optional[str] = None
    after_state: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

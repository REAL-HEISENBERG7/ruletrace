"""
RuleTrace AI — Validation Engine

Implements deterministic validation checks:
A. Completeness (missing required documents)
B. Document validity / expiry
C. Field consistency (cross-document comparison)
D. Duplicate detection (exact hash match)
E. Potential anomaly flags (suspicious metadata, dates, etc.)

Every finding is linked to:
  - The application
  - The relevant document(s)
  - The applicable configured rule
  - The evidence (field / extracted value)
  - A recommended next action

All checks are deterministic. AI heuristics are NOT invoked here.
Anomaly flags do NOT constitute proof of fraud.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.models import (
    Application, ApplicationStatus, ChecklistTemplate, Document,
    DocumentStatus, ExtractedField, FindingSeverity, FindingType,
    Rule, RuleSet, ValidationFinding, ValidationRun, ValidationStatus,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_effective_value(field: ExtractedField) -> Optional[str]:
    """Return corrected value if available, otherwise extracted value."""
    return field.corrected_value or field.extracted_value


def _parse_date_flexible(value: str) -> Optional[datetime]:
    """Try multiple date formats. Returns None if parsing fails."""
    if not value:
        return None
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d.%m.%Y",
        "%d %b %Y", "%d %B %Y", "%B %d, %Y", "%b %d, %Y",
        "%d/%m/%y", "%Y/%m/%d",
    ]
    clean = value.strip()
    for fmt in formats:
        try:
            return datetime.strptime(clean, fmt)
        except ValueError:
            continue
    # Try extracting just the date portion if there's extra text
    import re as _re
    m = _re.search(r"\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}", clean)
    if m:
        for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y"]:
            try:
                return datetime.strptime(m.group(0), fmt)
            except ValueError:
                continue
    return None


# ─────────────────────────────── Check A: Completeness ───────────────────────

def check_completeness(
    db: Session,
    application: Application,
    run_id: str,
    rule_set: RuleSet,
) -> List[ValidationFinding]:
    """
    Check that all required documents per the application category checklist
    have been uploaded (in any non-failed status).
    """
    findings: List[ValidationFinding] = []

    checklist: List[ChecklistTemplate] = (
        db.query(ChecklistTemplate)
        .filter(
            ChecklistTemplate.category_id == application.category_id,
            ChecklistTemplate.is_mandatory == True,
            ChecklistTemplate.is_active == True,
        )
        .all()
    )

    uploaded_type_codes = {
        d.document_type_code
        for d in application.documents
        if d.status != DocumentStatus.FAILED
    }

    for item in checklist:
        if item.document_type_code not in uploaded_type_codes:
            # Look for matching active rule
            rule = _find_rule(db, rule_set, "document_required", item.document_type_code, application.category_id)

            f = ValidationFinding(
                application_id=application.id,
                validation_run_id=run_id,
                rule_id=rule.id if rule else None,
                finding_type=FindingType.MISSING_DOCUMENT,
                status=ValidationStatus.FAIL,
                severity=FindingSeverity.CRITICAL if item.is_mandatory else FindingSeverity.MEDIUM,
                title=f"Required document missing: {item.document_type_name}",
                description=(
                    f"The document '{item.document_type_name}' is required for "
                    f"{application.category.name if application.category else 'this application category'} "
                    f"but has not been uploaded."
                ),
                evidence_field="document_checklist",
                evidence_value=f"Document type '{item.document_type_code}' not found",
                expected_value=f"'{item.document_type_name}' uploaded and processable",
                handbook_ref=item.annexure_reference or item.handbook_reference,
                recommended_action=(
                    f"Upload a valid '{item.document_type_name}' as required by "
                    f"{item.handbook_reference or 'the applicable handbook requirement'}."
                ),
                review_status="open",
            )
            findings.append(f)

    return findings


# ─────────────────────────────── Check B: Expiry ─────────────────────────────

EXPIRY_WARNING_DAYS = 90  # Flag documents expiring within 90 days


def check_expiry(
    db: Session,
    application: Application,
    run_id: str,
    rule_set: RuleSet,
) -> List[ValidationFinding]:
    """
    Check extracted/manually confirmed expiry dates against today.
    Flags: expired, expiry approaching, date unavailable.
    """
    findings: List[ValidationFinding] = []
    today = _now().replace(tzinfo=None)

    for doc in application.documents:
        if doc.status == DocumentStatus.FAILED:
            continue

        # Get expiry field from extracted fields
        expiry_field: Optional[ExtractedField] = None
        for ef in doc.extracted_fields:
            if ef.field_name == "expiry_date":
                expiry_field = ef
                break

        if expiry_field is None:
            # Check if this document type has a validity requirement
            checklist_item = (
                db.query(ChecklistTemplate)
                .filter(
                    ChecklistTemplate.category_id == application.category_id,
                    ChecklistTemplate.document_type_code == doc.document_type_code,
                    ChecklistTemplate.validity_days.isnot(None),
                )
                .first()
            )
            if checklist_item and checklist_item.validity_days:
                rule = _find_rule(db, rule_set, "expiry_check", doc.document_type_code, application.category_id)
                f = ValidationFinding(
                    application_id=application.id,
                    validation_run_id=run_id,
                    document_id=doc.id,
                    rule_id=rule.id if rule else None,
                    finding_type=FindingType.EXPIRED_DOCUMENT,
                    status=ValidationStatus.PENDING_VERIFICATION,
                    severity=FindingSeverity.MEDIUM,
                    title=f"Expiry date not extractable: {doc.document_type_name}",
                    description=(
                        f"The document '{doc.document_type_name}' requires a validity check, "
                        f"but no expiry date could be extracted. "
                        f"Manual verification required."
                    ),
                    evidence_field="expiry_date",
                    evidence_value="Not found in extracted text",
                    handbook_ref=checklist_item.handbook_reference,
                    recommended_action="Manually confirm the expiry date or request a clearly dated document.",
                    review_status="open",
                )
                findings.append(f)
            continue

        effective_val = _get_effective_value(expiry_field)
        if not effective_val:
            continue

        expiry_dt = _parse_date_flexible(effective_val)
        if expiry_dt is None:
            rule = _find_rule(db, rule_set, "expiry_check", doc.document_type_code, application.category_id)
            f = ValidationFinding(
                application_id=application.id,
                validation_run_id=run_id,
                document_id=doc.id,
                rule_id=rule.id if rule else None,
                finding_type=FindingType.EXPIRED_DOCUMENT,
                status=ValidationStatus.MANUAL_REVIEW_REQUIRED,
                severity=FindingSeverity.MEDIUM,
                title=f"Expiry date uncertain: {doc.document_type_name}",
                description=(
                    f"The extracted expiry date value '{effective_val}' could not be parsed to a valid date. "
                    f"{'Manually confirmed.' if expiry_field.is_manually_corrected else 'Extracted by OCR/text extraction.'} "
                    f"Manual review required."
                ),
                evidence_field="expiry_date",
                evidence_value=effective_val,
                handbook_ref=None,
                recommended_action="Review the document and manually confirm or correct the expiry date.",
                review_status="open",
            )
            findings.append(f)
            continue

        # Determine confidence note
        source_note = "manually confirmed" if expiry_field.is_manually_corrected else "OCR/text extracted (heuristic)"

        rule = _find_rule(db, rule_set, "expiry_check", doc.document_type_code, application.category_id)

        if expiry_dt < today:
            f = ValidationFinding(
                application_id=application.id,
                validation_run_id=run_id,
                document_id=doc.id,
                rule_id=rule.id if rule else None,
                finding_type=FindingType.EXPIRED_DOCUMENT,
                status=ValidationStatus.FAIL,
                severity=FindingSeverity.CRITICAL,
                title=f"Document appears expired: {doc.document_type_name}",
                description=(
                    f"The extracted expiry date '{effective_val}' ({source_note}) "
                    f"is before today ({today.strftime('%d %b %Y')}). "
                    f"This is a preliminary finding subject to extraction accuracy."
                ),
                evidence_field="expiry_date",
                evidence_value=effective_val,
                expected_value=f"Date on or after {today.strftime('%d %b %Y')}",
                handbook_ref=None,
                recommended_action="Request an updated, valid document or route for manual review if the date is incorrect.",
                review_status="open",
            )
            findings.append(f)

        elif (expiry_dt - today).days <= EXPIRY_WARNING_DAYS:
            days_left = (expiry_dt - today).days
            f = ValidationFinding(
                application_id=application.id,
                validation_run_id=run_id,
                document_id=doc.id,
                rule_id=rule.id if rule else None,
                finding_type=FindingType.EXPIRY_APPROACHING,
                status=ValidationStatus.WARNING,
                severity=FindingSeverity.MEDIUM,
                title=f"Document expiry approaching: {doc.document_type_name}",
                description=(
                    f"The extracted expiry date '{effective_val}' ({source_note}) "
                    f"is approximately {days_left} day(s) from today. "
                    f"The document may expire before processing is completed."
                ),
                evidence_field="expiry_date",
                evidence_value=effective_val,
                recommended_action="Verify whether the document will remain valid through the processing period.",
                review_status="open",
            )
            findings.append(f)

    return findings


# ─────────────────────────────── Check C: Field Consistency ──────────────────

def check_field_consistency(
    db: Session,
    application: Application,
    run_id: str,
    rule_set: RuleSet,
) -> List[ValidationFinding]:
    """
    Compare institution names and key identifiers across documents.
    Uses sensible normalization to avoid flagging harmless formatting differences.
    """
    findings: List[ValidationFinding] = []

    def _normalize(s: Optional[str]) -> str:
        if not s:
            return ""
        # Lowercase, strip whitespace, remove punctuation
        return re.sub(r"[^\w\s]", "", s.lower().strip())

    # Gather institution names from all documents
    inst_names: List[Dict[str, str]] = []
    for doc in application.documents:
        if doc.status == DocumentStatus.FAILED:
            continue
        for ef in doc.extracted_fields:
            if ef.field_name == "institution_name":
                val = _get_effective_value(ef)
                if val:
                    inst_names.append({
                        "doc_id": doc.id,
                        "doc_name": doc.document_type_name,
                        "value": val,
                        "normalized": _normalize(val),
                    })
                break

    # Compare pairs — flag if normalized values differ significantly
    for i in range(len(inst_names)):
        for j in range(i + 1, len(inst_names)):
            a = inst_names[i]
            b = inst_names[j]
            # Skip if one is a substring of the other (abbreviations)
            if a["normalized"] in b["normalized"] or b["normalized"] in a["normalized"]:
                continue
            # Simple word overlap check
            words_a = set(a["normalized"].split())
            words_b = set(b["normalized"].split())
            if not words_a or not words_b:
                continue
            overlap = len(words_a & words_b) / max(len(words_a), len(words_b))
            if overlap < 0.5:  # Less than 50% word overlap = potential mismatch
                rule = _find_rule(db, rule_set, "field_consistency", None, application.category_id)
                f = ValidationFinding(
                    application_id=application.id,
                    validation_run_id=run_id,
                    document_id=a["doc_id"],
                    rule_id=rule.id if rule else None,
                    finding_type=FindingType.FIELD_MISMATCH,
                    status=ValidationStatus.WARNING,
                    severity=FindingSeverity.HIGH,
                    title="Institution name inconsistency across documents",
                    description=(
                        f"The institution name in '{a['doc_name']}' ('{a['value']}') "
                        f"differs significantly from '{b['doc_name']}' ('{b['value']}'). "
                        f"This may indicate different institutions, an abbreviation, or a data-entry discrepancy."
                    ),
                    evidence_field="institution_name",
                    evidence_value=a["value"],
                    compared_with_doc_id=b["doc_id"],
                    compared_field="institution_name",
                    compared_value=b["value"],
                    recommended_action="Review both documents and confirm whether they refer to the same institution.",
                    review_status="open",
                )
                findings.append(f)

    return findings


# ─────────────────────────────── Check D: Duplicates ─────────────────────────

def check_duplicates(
    db: Session,
    application: Application,
    run_id: str,
    rule_set: RuleSet,
) -> List[ValidationFinding]:
    """
    Detect exact-duplicate files using SHA-256 hash.
    Also checks across other applications for cross-submission duplicates.
    """
    findings: List[ValidationFinding] = []

    # Within this application
    hash_seen: Dict[str, str] = {}
    for doc in application.documents:
        if not doc.file_hash or doc.status == DocumentStatus.FAILED:
            continue
        if doc.file_hash in hash_seen:
            f = ValidationFinding(
                application_id=application.id,
                validation_run_id=run_id,
                document_id=doc.id,
                finding_type=FindingType.DUPLICATE_DETECTED,
                status=ValidationStatus.WARNING,
                severity=FindingSeverity.HIGH,
                title=f"Duplicate file detected: {doc.document_type_name}",
                description=(
                    f"The file '{doc.original_filename}' (SHA-256: {doc.file_hash[:16]}...) "
                    f"is an exact byte-for-byte duplicate of another document in this application. "
                    f"This is a preliminary flag — not a conclusion of fraud."
                ),
                evidence_field="file_hash",
                evidence_value=doc.file_hash,
                compared_with_doc_id=hash_seen[doc.file_hash],
                recommended_action="Verify that the same file has not been submitted for two different document requirements.",
                review_status="open",
            )
            findings.append(f)
        else:
            hash_seen[doc.file_hash] = doc.id

    # Cross-application check (same doc type, same institution, same hash)
    for doc in application.documents:
        if not doc.file_hash or doc.status == DocumentStatus.FAILED:
            continue
        cross_docs = (
            db.query(Document)
            .join(Application, Document.application_id == Application.id)
            .filter(
                Document.file_hash == doc.file_hash,
                Document.id != doc.id,
                Application.id != application.id,
                Application.institution_id != application.institution_id,
            )
            .limit(3)
            .all()
        )
        if cross_docs:
            other_ids = [d.application_id for d in cross_docs]
            f = ValidationFinding(
                application_id=application.id,
                validation_run_id=run_id,
                document_id=doc.id,
                finding_type=FindingType.DUPLICATE_DETECTED,
                status=ValidationStatus.WARNING,
                severity=FindingSeverity.MEDIUM,
                title=f"Document appears in another application: {doc.document_type_name}",
                description=(
                    f"The file '{doc.original_filename}' matches an identical file in application(s): "
                    f"{', '.join(other_ids[:3])}. This may be legitimate or may require verification."
                ),
                evidence_field="file_hash",
                evidence_value=doc.file_hash,
                recommended_action="Verify whether reuse of this document across applications is permitted.",
                review_status="open",
            )
            findings.append(f)

    return findings


# ─────────────────────────────── Check E: Anomalies ──────────────────────────

def check_anomalies(
    db: Session,
    application: Application,
    run_id: str,
    rule_set: RuleSet,
) -> List[ValidationFinding]:
    """
    Heuristic anomaly checks. Each finding is clearly labelled as a
    PRELIMINARY FLAG requiring human review — NOT proof of any irregularity.
    """
    findings: List[ValidationFinding] = []
    today = _now().replace(tzinfo=None)

    for doc in application.documents:
        if doc.status == DocumentStatus.FAILED:
            continue

        # Check: issue date after expiry date (suspicious sequence)
        issue_field = next((ef for ef in doc.extracted_fields if ef.field_name == "issue_date"), None)
        expiry_field = next((ef for ef in doc.extracted_fields if ef.field_name == "expiry_date"), None)

        if issue_field and expiry_field:
            issue_val = _get_effective_value(issue_field)
            expiry_val = _get_effective_value(expiry_field)
            if issue_val and expiry_val:
                issue_dt = _parse_date_flexible(issue_val)
                expiry_dt = _parse_date_flexible(expiry_val)
                if issue_dt and expiry_dt and issue_dt > expiry_dt:
                    f = ValidationFinding(
                        application_id=application.id,
                        validation_run_id=run_id,
                        document_id=doc.id,
                        finding_type=FindingType.ANOMALY_FLAG,
                        status=ValidationStatus.MANUAL_REVIEW_REQUIRED,
                        severity=FindingSeverity.HIGH,
                        title=f"Potential anomaly: Issue date after expiry date — {doc.document_type_name}",
                        description=(
                            f"The extracted issue date ('{issue_val}') appears to be after the "
                            f"extracted expiry date ('{expiry_val}') in '{doc.document_type_name}'. "
                            f"This may indicate an extraction error or requires verification. "
                            f"This is a PRELIMINARY FLAG, not a conclusion."
                        ),
                        evidence_field="issue_date",
                        evidence_value=issue_val,
                        compared_field="expiry_date",
                        compared_value=expiry_val,
                        recommended_action="Review the source document. Correct extraction errors if present. Route for human verification.",
                        review_status="open",
                    )
                    findings.append(f)

        # Check: future issue date (date in the future)
        if issue_field:
            issue_val = _get_effective_value(issue_field)
            if issue_val:
                issue_dt = _parse_date_flexible(issue_val)
                if issue_dt and issue_dt > today + timedelta(days=1):
                    f = ValidationFinding(
                        application_id=application.id,
                        validation_run_id=run_id,
                        document_id=doc.id,
                        finding_type=FindingType.ANOMALY_FLAG,
                        status=ValidationStatus.MANUAL_REVIEW_REQUIRED,
                        severity=FindingSeverity.HIGH,
                        title=f"Potential anomaly: Issue date in the future — {doc.document_type_name}",
                        description=(
                            f"The extracted issue date '{issue_val}' appears to be in the future "
                            f"(after today, {today.strftime('%d %b %Y')}). "
                            f"This may indicate an extraction error. PRELIMINARY FLAG — verification required."
                        ),
                        evidence_field="issue_date",
                        evidence_value=issue_val,
                        recommended_action="Verify the document's actual issue date against the source.",
                        review_status="open",
                    )
                    findings.append(f)

        # Check: very short extracted text for a multi-page document (possible image-only PDF not OCR'd)
        if doc.page_count and doc.page_count > 2 and doc.extracted_text:
            avg_chars = len(doc.extracted_text) / doc.page_count
            if avg_chars < 30 and not doc.has_digital_text:
                f = ValidationFinding(
                    application_id=application.id,
                    validation_run_id=run_id,
                    document_id=doc.id,
                    finding_type=FindingType.ANOMALY_FLAG,
                    status=ValidationStatus.MANUAL_REVIEW_REQUIRED,
                    severity=FindingSeverity.LOW,
                    title=f"Low text extraction quality: {doc.document_type_name}",
                    description=(
                        f"Very little text was extracted from '{doc.original_filename}' "
                        f"({doc.page_count} pages, avg {avg_chars:.0f} chars/page). "
                        f"The document may be a low-quality scan. Manual review of the original file is recommended."
                    ),
                    evidence_field="extracted_text_length",
                    evidence_value=f"{len(doc.extracted_text)} characters from {doc.page_count} pages",
                    recommended_action="Review the original document. Request a higher-quality scan or digital copy if needed.",
                    review_status="open",
                )
                findings.append(f)

    return findings


# ─────────────────────────────── Main Runner ─────────────────────────────────

def run_validation(db: Session, application: Application, triggered_by_id: Optional[str] = None) -> ValidationRun:
    """
    Run all validation checks for an application.
    Creates a ValidationRun and all resulting ValidationFinding records.
    """
    # Load active rule set
    rule_set = db.query(RuleSet).filter(RuleSet.is_active == True).order_by(RuleSet.created_at.desc()).first()
    if not rule_set:
        # Create a default rule set if none exists
        rule_set = RuleSet(
            name="AICTE APH 2024-27 Rules",
            version="2024-27-v1",
            source_document="AICTE Approval Process Handbook 2024-25 to 2026-27",
            is_active=True,
        )
        db.add(rule_set)
        db.flush()

    run = ValidationRun(
        application_id=application.id,
        rule_set_id=rule_set.id,
        triggered_by_id=triggered_by_id,
    )
    db.add(run)
    db.flush()

    # Close previous open findings for this application (they will be replaced)
    # Keep reviewed ones; only replace "open" findings
    db.query(ValidationFinding).filter(
        ValidationFinding.application_id == application.id,
        ValidationFinding.review_status == "open",
    ).delete(synchronize_session=False)
    db.flush()

    all_findings: List[ValidationFinding] = []

    # Ensure relationships are loaded
    db.refresh(application)

    all_findings += check_completeness(db, application, run.id, rule_set)
    all_findings += check_expiry(db, application, run.id, rule_set)
    all_findings += check_field_consistency(db, application, run.id, rule_set)
    all_findings += check_duplicates(db, application, run.id, rule_set)
    all_findings += check_anomalies(db, application, run.id, rule_set)

    for f in all_findings:
        db.add(f)

    # Update run summary
    run.completed_at = _now()
    run.total_checks = len(all_findings)
    run.passed = sum(1 for f in all_findings if f.status == ValidationStatus.PASS)
    run.failed = sum(1 for f in all_findings if f.status == ValidationStatus.FAIL)
    run.warnings = sum(1 for f in all_findings if f.status == ValidationStatus.WARNING)
    run.not_checked = sum(1 for f in all_findings if f.status in {
        ValidationStatus.NOT_CHECKED, ValidationStatus.PENDING_VERIFICATION, ValidationStatus.MANUAL_REVIEW_REQUIRED
    })

    # Update application validation status
    if run.failed > 0:
        application.validation_status = ValidationStatus.FAIL
    elif run.warnings > 0 or run.not_checked > 0:
        application.validation_status = ValidationStatus.WARNING
    else:
        application.validation_status = ValidationStatus.PASS
    application.last_validated_at = _now()

    db.flush()
    return run


# ─────────────────────────────── Helper ──────────────────────────────────────

def _find_rule(
    db: Session,
    rule_set: RuleSet,
    check_type: str,
    document_type_code: Optional[str],
    category_id: Optional[str],
) -> Optional[Rule]:
    """Find the most specific active rule matching check_type and doc/category."""
    q = db.query(Rule).filter(
        Rule.rule_set_id == rule_set.id,
        Rule.check_type == check_type,
        Rule.status == "active",
    )
    if document_type_code:
        r = q.filter(Rule.document_type_code == document_type_code).first()
        if r:
            return r
    if category_id:
        r = q.filter(Rule.category_id == category_id, Rule.document_type_code.is_(None)).first()
        if r:
            return r
    return q.filter(Rule.document_type_code.is_(None), Rule.category_id.is_(None)).first()

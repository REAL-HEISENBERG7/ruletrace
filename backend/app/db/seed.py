"""
RuleTrace AI — Seed Data

Seeds the database with:
1. Demo users (all roles)
2. Application categories based on AICTE APH Chapter II
3. Checklist templates from Annexure 2
4. Rule sets and rules from verified APH clauses (Chapter II, Annexure 2)
5. Demo institutions
6. Demo applications with documents and synthetic findings (all 8 scenarios)

All demo data is clearly marked as synthetic/illustrative.
Never use real institutional or personal data in this file.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.models import (
    Application, ApplicationCategory, ApplicationStatus,
    ChecklistTemplate, ComplianceObservation, Document,
    DocumentStatus, ExtractedField, ExternalConnector,
    FindingSeverity, FindingType, Institution,
    Notification, AlertSeverity,
    Report, Rule, RuleSet, RuleStatus,
    User, UserRole, ValidationFinding, ValidationStatus,
    VerificationAttempt, VerificationStatus, ValidationRun,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid(seed: str) -> str:
    """Deterministic UUID from a seed string for reproducible demo data."""
    return str(hashlib.md5(seed.encode()).hexdigest()[:8] + "-" +
               hashlib.md5(seed.encode()).hexdigest()[8:12] + "-4" +
               hashlib.md5(seed.encode()).hexdigest()[12:15] + "-a" +
               hashlib.md5(seed.encode()).hexdigest()[15:18] + "-" +
               hashlib.md5(seed.encode()).hexdigest()[18:30])


def seed_database(db: Session) -> None:
    """Idempotent seed: checks if data exists before inserting."""
    if db.query(User).first():
        return  # Already seeded

    print("Seeding database with demo data...")

    # ─── 1. Demo Users ───────────────────────────────────────────────────────
    users = {}

    admin = User(
        id=_uuid("admin-user"),
        email="admin@ruletrace.demo",
        full_name="Admin User",
        hashed_password=hash_password("Admin@123"),
        role=UserRole.ADMINISTRATOR,
        is_active=True,
    )
    db.add(admin)
    users["admin"] = admin

    reviewer = User(
        id=_uuid("reviewer-user"),
        email="reviewer@ruletrace.demo",
        full_name="Dr. Priya Sharma",
        hashed_password=hash_password("Reviewer@123"),
        role=UserRole.REVIEWER,
        is_active=True,
    )
    db.add(reviewer)
    users["reviewer"] = reviewer

    audit_user = User(
        id=_uuid("audit-user"),
        email="auditor@ruletrace.demo",
        full_name="Audit Officer",
        hashed_password=hash_password("Audit@123"),
        role=UserRole.AUDIT_VIEWER,
        is_active=True,
    )
    db.add(audit_user)
    users["auditor"] = audit_user

    # ─── 2. Demo Institution ─────────────────────────────────────────────────
    inst = Institution(
        id=_uuid("inst-demo-1"),
        name="Sunrise Institute of Technology (DEMO)",
        aicte_id="DEMO-AICTE-2024-SIT-001",
        institution_type="Private Self-Financing",
        state="Maharashtra",
        district="Pune",
        city="Pune",
        address="Survey No. 45, Baner Road, Pune - 411045 (SYNTHETIC DEMO DATA)",
        pincode="411045",
        phone="020-12345678",
        email="principal@sunrise-demo.edu",
        website="https://example-demo.edu",
        affiliating_university="Savitribai Phule Pune University (Demo)",
        established_year=2005,
        is_demo=True,
    )
    db.add(inst)
    db.flush()

    inst_user = User(
        id=_uuid("inst-user-1"),
        email="institution@ruletrace.demo",
        full_name="Rajesh Kumar (Institution)",
        hashed_password=hash_password("Inst@123"),
        role=UserRole.INSTITUTION,
        institution_id=inst.id,
        is_active=True,
    )
    db.add(inst_user)
    users["institution"] = inst_user
    db.flush()

    # ─── 3. Application Categories ────────────────────────────────────────────
    # Based on Chapter II of APH 2024-27, Clause 2.3 and introductory list
    cats = {}

    cat_eoa_sd = ApplicationCategory(
        id=_uuid("cat-eoa-sd"),
        code="EOA_SELF_DISCLOSURE",
        name="Extension of Approval — Self-Disclosure",
        description=(
            "Annual extension of approval for existing institutions based on self-disclosure "
            "of availability of required facilities and infrastructure. "
            "Documents as per Annexure 2, Section 2.1 of the APH."
        ),
        handbook_reference="APH 2024-27, Chapter II, Clause 2.5; Annexure 2, Section 2.1",
        is_active=True,
    )
    db.add(cat_eoa_sd)
    cats["eoa_sd"] = cat_eoa_sd

    cat_intake = ApplicationCategory(
        id=_uuid("cat-intake"),
        code="INCREASE_INTAKE_COURSE",
        name="Increase in Intake / Additional Course",
        description=(
            "Application for increase in approved intake or addition of new courses in existing programmes. "
            "Subject to EVC as per APH Clause 2.6."
        ),
        handbook_reference="APH 2024-27, Chapter II, Clause 2.6; Annexure 2, Section 2.6",
        is_active=True,
    )
    db.add(cat_intake)
    cats["intake"] = cat_intake

    cat_new_prog = ApplicationCategory(
        id=_uuid("cat-new-prog"),
        code="NEW_PROGRAMME",
        name="New Programme / Level in Existing Institution",
        description=(
            "Application by an existing institution to start a new programme or level. "
            "Subject to Scrutiny/Re-Scrutiny and EVC as per APH Clause 2.7."
        ),
        handbook_reference="APH 2024-27, Chapter II, Clause 2.7; Annexure 2, Section 2.3",
        is_active=True,
    )
    db.add(cat_new_prog)
    cats["new_prog"] = cat_new_prog

    cat_closure = ApplicationCategory(
        id=_uuid("cat-closure"),
        code="CLOSURE",
        name="Progressive / Complete Closure",
        description="Application for progressive or complete closure of institution or programme.",
        handbook_reference="APH 2024-27, Chapter II, Clause 2.17; Annexure 2, Section 2.7",
        is_active=True,
    )
    db.add(cat_closure)
    cats["closure"] = cat_closure

    db.flush()

    # ─── 4. Checklist Templates — based on Annexure 2, Section 2.1 (EoA SD) ──
    # Source: APH 2024-27, Annexure 2, Section 2.1, PDF pages 97-98, Printed pages 81-82

    eoa_items = [
        {
            "code": "AFFIDAVIT_2",
            "name": "Affidavit 2 (Chairman/Secretary, Rs. 100 e-stamp, DSC)",
            "description": (
                "Affidavit 2 sworn before First Class Judicial Magistrate or Public Notary or "
                "Oath Commissioner on Rs.100/- Non-Judicial stamp paper / e-stamp paper, "
                "Digitally Signed."
            ),
            "mandatory": True,
            "validity_days": 365,
            "handbook_ref": "APH 2024-27, Chapter II, Clause 2.3.4(b); Annexure 2, Section 2.1(i)",
            "annexure_ref": "Annexure 2, Section 2.1(i)",
            "sort": 1,
        },
        {
            "code": "TER_PAYMENT_RECEIPT",
            "name": "TER Charges Payment Receipt",
            "description": (
                "Copy of pay receipt printed from AICTE Web-Portal for Extension of Approval for "
                "the respective Academic Year."
            ),
            "mandatory": True,
            "validity_days": 365,
            "handbook_ref": "APH 2024-27, Chapter II, Clause 2.3.2; Annexure 2, Section 2.1(ii)",
            "annexure_ref": "Annexure 2, Section 2.1(ii)",
            "sort": 2,
        },
        {
            "code": "OCCUPANCY_CERTIFICATE",
            "name": "Occupancy / Completion Certificate / Building License / Form D",
            "description": (
                "Valid Occupancy/Completion Certificate/Building License/Form D issued by the "
                "Competent Authority. As per Clause 7.17 of APH."
            ),
            "mandatory": True,
            "validity_days": None,  # No standard expiry but must be valid
            "handbook_ref": "APH 2024-27, Chapter II, Annexure 2, Section 2.1(iii); Chapter VI, Clause 7.17",
            "annexure_ref": "Annexure 2, Section 2.1(iii)",
            "sort": 3,
        },
        {
            "code": "STRUCTURAL_STABILITY_CERT",
            "name": "Structural Stability Certificate (if building >30 years)",
            "description": (
                "Valid Structural Stability Certificate from a registered Structural Engineer "
                "certifying the building is fit for human habitation, if the building is more "
                "than thirty years from the issue of Completion Certificate."
            ),
            "mandatory": False,  # Conditional on building age
            "validity_days": 365,
            "handbook_ref": "APH 2024-27, Annexure 2, Section 2.1(iv)",
            "annexure_ref": "Annexure 2, Section 2.1(iv)",
            "sort": 4,
        },
        {
            "code": "FIRE_SAFETY_CERTIFICATE",
            "name": "Fire Safety Certificate",
            "description": (
                "A valid Fire Safety Certificate issued by the Competent Authority."
            ),
            "mandatory": True,
            "validity_days": 365,
            "handbook_ref": "APH 2024-27, Annexure 2, Section 2.1(v)",
            "annexure_ref": "Annexure 2, Section 2.1(v)",
            "sort": 5,
        },
        {
            "code": "SATELLITE_MAP",
            "name": "Satellite Map with GPS Coordinates",
            "description": (
                "Satellite map using a suitable website showing the geographical location of the "
                "land with latitude and longitude at the entrance of the main building."
            ),
            "mandatory": True,
            "validity_days": None,
            "handbook_ref": "APH 2024-27, Annexure 2, Section 2.1(vi)",
            "annexure_ref": "Annexure 2, Section 2.1(vi)",
            "sort": 6,
        },
        {
            "code": "AUDITED_ACCOUNTS",
            "name": "Audited Statement of Accounts (Previous Year)",
            "description": (
                "Audited statement of accounts of the Trust/Society/Company of the previous year."
            ),
            "mandatory": True,
            "validity_days": 548,  # roughly 18 months
            "handbook_ref": "APH 2024-27, Annexure 2, Section 2.1(vii)",
            "annexure_ref": "Annexure 2, Section 2.1(vii)",
            "sort": 7,
        },
    ]

    for item in eoa_items:
        ct = ChecklistTemplate(
            id=_uuid(f"ct-eoa-{item['code']}"),
            category_id=cat_eoa_sd.id,
            document_type_code=item["code"],
            document_type_name=item["name"],
            description=item["description"],
            is_mandatory=item["mandatory"],
            validity_days=item["validity_days"],
            handbook_reference=item["handbook_ref"],
            annexure_reference=item["annexure_ref"],
            sort_order=item["sort"],
        )
        db.add(ct)

    # Additional items for Increase in Intake (Annexure 2, Section 2.6)
    intake_items = [
        {
            "code": "AFFIDAVIT_8",
            "name": "Affidavit 8 (Increase in Intake)",
            "description": "Affidavit 8 on Non-Judicial Stamp Paper/e-stamp paper of Rs.100/- duly sworn before a First Class Judicial Magistrate or Notary or an Oath Commissioner.",
            "mandatory": True, "validity_days": 365,
            "handbook_ref": "APH 2024-27, Annexure 2, Section 2.6(i)",
            "annexure_ref": "Annexure 2, Section 2.6(i)", "sort": 1,
        },
        {
            "code": "TRUST_RESOLUTION",
            "name": "Trust/Society/Company Resolution (Additional Course/Division)",
            "description": "Resolution of the Trust/Society/Company approving starting additional Course(s)/Division(s) and allocation of Land/Building/Funds, duly signed by the Chairman/Secretary in Format 3.",
            "mandatory": True, "validity_days": 365,
            "handbook_ref": "APH 2024-27, Annexure 2, Section 2.6(iii)",
            "annexure_ref": "Annexure 2, Section 2.6(iii)", "sort": 2,
        },
        {
            "code": "FIRE_SAFETY_CERTIFICATE",
            "name": "Fire Safety Certificate",
            "description": "Valid Fire Safety Certificate issued by the Competent Authority.",
            "mandatory": True, "validity_days": 365,
            "handbook_ref": "APH 2024-27, Annexure 2, Section 2.1(v) (applicable)",
            "annexure_ref": "Annexure 2, Section 2.1(v)", "sort": 3,
        },
        {
            "code": "OCCUPANCY_CERTIFICATE",
            "name": "Occupancy / Completion Certificate",
            "description": "Valid Occupancy/Completion Certificate from the Competent Authority.",
            "mandatory": True, "validity_days": None,
            "handbook_ref": "APH 2024-27, Annexure 2, Section 2.1(iii)",
            "annexure_ref": "Annexure 2, Section 2.1(iii)", "sort": 4,
        },
    ]

    for item in intake_items:
        ct = ChecklistTemplate(
            id=_uuid(f"ct-intake-{item['code']}"),
            category_id=cat_intake.id,
            document_type_code=item["code"],
            document_type_name=item["name"],
            description=item["description"],
            is_mandatory=item["mandatory"],
            validity_days=item["validity_days"],
            handbook_reference=item["handbook_ref"],
            annexure_reference=item["annexure_ref"],
            sort_order=item["sort"],
        )
        db.add(ct)

    db.flush()

    # ─── 5. Rule Set & Rules ──────────────────────────────────────────────────
    rule_set = RuleSet(
        id=_uuid("ruleset-aph-2024"),
        name="AICTE APH 2024-27 Rules",
        version="2024-27-v1",
        source_document="AICTE Approval Process Handbook 2024-25 to 2026-27",
        effective_from=datetime(2024, 4, 1, tzinfo=timezone.utc),
        is_active=True,
        description=(
            "Rules derived from the AICTE Approval Process Handbook 2024-25 to 2026-27. "
            "Rules marked ACTIVE have been verified against source text. "
            "DRAFT rules require further verification before use in production."
        ),
    )
    db.add(rule_set)
    db.flush()

    rules_data = [
        # Completeness rules — Annexure 2, Section 2.1
        {
            "code": "EOA-ANN2-2.1-i",
            "name": "Affidavit 2 Required for EoA",
            "description": "An Affidavit 2 with digital signature must be uploaded for EoA based on self-disclosure.",
            "chapter": "II", "clause": "2.3.4(b)", "annexure": "Annexure 2, Section 2.1(i)",
            "pdf_page": 97, "printed_page": "81",
            "excerpt": "An Affidavit 2 sworn before First Class Judicial Magistrate or Public Notary or an Oath Commissioner on Rs.100/- Non-Judicial stamp paper / e-stamp paper shall be Digitally Signed & uploaded on AICTE web portal.",
            "check_type": "document_required", "doc_code": "AFFIDAVIT_2",
            "severity": FindingSeverity.CRITICAL, "status": RuleStatus.ACTIVE,
            "action": "Upload a valid Affidavit 2, digitally signed by the Chairman/Secretary, on Rs.100 e-stamp paper.",
        },
        {
            "code": "EOA-ANN2-2.1-ii",
            "name": "TER Payment Receipt Required",
            "description": "Copy of TER charges payment receipt must be uploaded.",
            "chapter": "II", "clause": "2.3.2", "annexure": "Annexure 2, Section 2.1(ii)",
            "pdf_page": 97, "printed_page": "81",
            "excerpt": "Copy of pay receipt print made on AICTE Web-Portal if any, in respect of Extension of Approval for the respective Academic Year.",
            "check_type": "document_required", "doc_code": "TER_PAYMENT_RECEIPT",
            "severity": FindingSeverity.CRITICAL, "status": RuleStatus.ACTIVE,
            "action": "Upload proof of TER charges payment from the AICTE Web-Portal.",
        },
        {
            "code": "EOA-ANN2-2.1-iii",
            "name": "Occupancy / Completion Certificate Required",
            "description": "Valid Occupancy/Completion Certificate/Building License/Form D must be uploaded.",
            "chapter": "II", "clause": "7.17", "annexure": "Annexure 2, Section 2.1(iii)",
            "pdf_page": 97, "printed_page": "81",
            "excerpt": "As per Clause 7.17 of the Approval Process Handbook, valid Occupancy/Completion Certificate/Building License/Form D issued by the Competent Authority.",
            "check_type": "document_required", "doc_code": "OCCUPANCY_CERTIFICATE",
            "severity": FindingSeverity.CRITICAL, "status": RuleStatus.ACTIVE,
            "action": "Upload a valid Occupancy/Completion Certificate from the Competent Authority.",
        },
        {
            "code": "EOA-ANN2-2.1-v",
            "name": "Fire Safety Certificate Required",
            "description": "A valid Fire Safety Certificate must be uploaded.",
            "chapter": "II", "clause": None, "annexure": "Annexure 2, Section 2.1(v)",
            "pdf_page": 97, "printed_page": "81",
            "excerpt": "A valid Fire Safety Certificate issued by the Competent Authority.",
            "check_type": "document_required", "doc_code": "FIRE_SAFETY_CERTIFICATE",
            "severity": FindingSeverity.CRITICAL, "status": RuleStatus.ACTIVE,
            "action": "Upload a valid Fire Safety Certificate from the Competent Authority.",
        },
        {
            "code": "EOA-ANN2-2.1-vii",
            "name": "Audited Accounts Required",
            "description": "Audited statement of accounts of the Trust/Society/Company of the previous year must be uploaded.",
            "chapter": "II", "clause": None, "annexure": "Annexure 2, Section 2.1(vii)",
            "pdf_page": 98, "printed_page": "82",
            "excerpt": "Audited statement of accounts of the Trust/Society/Company of the previous year.",
            "check_type": "document_required", "doc_code": "AUDITED_ACCOUNTS",
            "severity": FindingSeverity.HIGH, "status": RuleStatus.ACTIVE,
            "action": "Upload the previous year's audited accounts of the Trust/Society/Company.",
        },
        # Expiry rules
        {
            "code": "EXPIRY-FIRE-365",
            "name": "Fire Safety Certificate Validity",
            "description": "Fire Safety Certificates must be currently valid. Annual renewal is expected.",
            "chapter": "II", "clause": None, "annexure": "Annexure 2, Section 2.1(v)",
            "pdf_page": 97, "printed_page": "81",
            "excerpt": "A valid Fire Safety Certificate issued by the Competent Authority.",
            "check_type": "expiry_check", "doc_code": "FIRE_SAFETY_CERTIFICATE",
            "severity": FindingSeverity.CRITICAL, "status": RuleStatus.ACTIVE,
            "action": "Request a renewed Fire Safety Certificate from the Competent Authority.",
        },
        {
            "code": "EXPIRY-AFF2-365",
            "name": "Affidavit 2 Validity",
            "description": "Affidavit 2 must not be older than 12 months from the date of application.",
            "chapter": "II", "clause": "2.3.4(b)", "annexure": "Annexure 2, Section 2.1(i)",
            "pdf_page": 97, "printed_page": "81",
            "excerpt": "An Affidavit 2 sworn before First Class Judicial Magistrate... shall be Digitally Signed & uploaded.",
            "check_type": "expiry_check", "doc_code": "AFFIDAVIT_2",
            "severity": FindingSeverity.HIGH, "status": RuleStatus.ACTIVE,
            "action": "Request a freshly sworn Affidavit 2 within the applicable validity period.",
        },
        # Consistency rules
        {
            "code": "CONSIST-INST-NAME",
            "name": "Institution Name Consistency Across Documents",
            "description": "The institution name extracted from uploaded documents must be consistent with each other and with the application record.",
            "chapter": "II", "clause": "2.3.4", "annexure": None,
            "pdf_page": 98, "printed_page": "82",
            "excerpt": "All Institutions shall upload the documents (Digitally Signed using DSC) as per Annexure-2.",
            "check_type": "field_consistency", "doc_code": None,
            "severity": FindingSeverity.HIGH, "status": RuleStatus.ACTIVE,
            "action": "Review both documents and confirm whether they refer to the same institution. Correct extraction errors if present.",
        },
    ]

    for rd in rules_data:
        rule = Rule(
            id=_uuid(f"rule-{rd['code']}"),
            rule_set_id=rule_set.id,
            category_id=cat_eoa_sd.id,
            code=rd["code"],
            name=rd["name"],
            description=rd["description"],
            handbook_version="APH 2024-27",
            chapter=rd["chapter"],
            clause=rd["clause"],
            annexure=rd["annexure"],
            pdf_page=rd["pdf_page"],
            printed_page=rd["printed_page"],
            source_excerpt=rd["excerpt"],
            check_type=rd["check_type"],
            document_type_code=rd.get("doc_code"),
            severity=rd["severity"],
            recommended_action=rd["action"],
            status=rd["status"],
            created_by_id=admin.id,
        )
        db.add(rule)

    db.flush()

    # ─── 6. External Connectors ───────────────────────────────────────────────
    connectors = [
        ExternalConnector(
            id=_uuid("conn-aicte"),
            name="AICTE Portal Integration",
            connector_type="api",
            is_configured=False,
            is_demo=True,
            description="AICTE Web-Portal institutional records and application data.",
            status_note="Not configured — demo mode. No authorized AICTE portal credentials are present.",
        ),
        ExternalConnector(
            id=_uuid("conn-digilocker"),
            name="DigiLocker Verification",
            connector_type="api",
            is_configured=False,
            is_demo=True,
            description="DigiLocker API for verifying government-issued certificates.",
            status_note="Not configured — demo mode.",
        ),
        ExternalConnector(
            id=_uuid("conn-qr"),
            name="QR Code Decoder (Local)",
            connector_type="qr",
            is_configured=True,
            is_demo=False,
            description="Local QR code decoding from uploaded documents. Decoding ≠ verification of issuer.",
            status_note="Configured for local QR decoding only. Issuer verification requires additional connector.",
        ),
    ]
    for c in connectors:
        db.add(c)

    db.flush()

    # ─── 7. Demo Applications & Scenarios ────────────────────────────────────
    # Scenario A: Missing required document
    app_a = Application(
        id=_uuid("app-scenario-a"),
        reference_number="RT-DEMO-2024-001",
        institution_id=inst.id,
        category_id=cat_eoa_sd.id,
        academic_year="2024-25",
        status=ApplicationStatus.SUBMITTED,
        validation_status=ValidationStatus.FAIL,
        created_by_id=inst_user.id,
        assigned_reviewer_id=reviewer.id,
        submitted_at=_now() - timedelta(days=5),
        next_action="Upload missing Affidavit 2 and Fire Safety Certificate.",
        is_demo=True,
    )
    db.add(app_a)
    db.flush()

    # Upload 3 of 7 required docs — missing Affidavit 2, Fire Safety, Audited Accounts
    doc_a1 = Document(
        id=_uuid("doc-a-ter"),
        application_id=app_a.id,
        document_type_code="TER_PAYMENT_RECEIPT",
        document_type_name="TER Charges Payment Receipt",
        original_filename="ter_payment_2024.pdf",
        stored_filename="demo_ter_receipt.pdf",
        file_path="demo/demo_ter_receipt.pdf",
        file_size_bytes=45000,
        mime_type="application/pdf",
        file_hash=hashlib.sha256(b"demo-ter-receipt-data-2024").hexdigest(),
        status=DocumentStatus.EXTRACTED,
        uploaded_by_id=inst_user.id,
        page_count=1,
        has_digital_text=True,
        extraction_method="digital_text",
        extracted_text=(
            "AICTE Web-Portal\nPayment Receipt\nInstitution Name: Sunrise Institute of Technology\n"
            "TER Charges: Rs. 20,000/-\nAcademic Year: 2024-25\nDate: 15/04/2024\n"
            "Transaction ID: AICTE-TER-2024-789456\nStatus: PAID"
        ),
        classification_result="TER Payment Receipt",
        issue_date=datetime(2024, 4, 15),
        is_demo=True,
    )
    db.add(doc_a1)
    db.flush()

    for fname, fval in [
        ("institution_name", "Sunrise Institute of Technology"),
        ("issue_date", "15/04/2024"),
        ("certificate_number", "AICTE-TER-2024-789456"),
    ]:
        db.add(ExtractedField(
            document_id=doc_a1.id,
            field_name=fname,
            field_label=fname.replace("_", " ").title(),
            extracted_value=fval,
            effective_value=fval,
            confidence_label="high",
            source_page=1,
        ))

    doc_a2 = Document(
        id=_uuid("doc-a-occ"),
        application_id=app_a.id,
        document_type_code="OCCUPANCY_CERTIFICATE",
        document_type_name="Occupancy / Completion Certificate",
        original_filename="occupancy_certificate.pdf",
        stored_filename="demo_occupancy.pdf",
        file_path="demo/demo_occupancy.pdf",
        file_size_bytes=78000,
        mime_type="application/pdf",
        file_hash=hashlib.sha256(b"demo-occupancy-cert-data-2024").hexdigest(),
        status=DocumentStatus.EXTRACTED,
        uploaded_by_id=inst_user.id,
        page_count=2,
        has_digital_text=True,
        extraction_method="digital_text",
        extracted_text=(
            "MUNICIPAL CORPORATION OF PUNE\nOCCUPANCY CERTIFICATE\n"
            "Certificate No: MCP-OCC-2019-4521\n"
            "This is to certify that the building of\n"
            "Sunrise Institute of Technology\nSurvey No. 45, Baner Road, Pune - 411045\n"
            "has been completed and is fit for occupation.\n"
            "Issued on: 12/03/2019\nCompetent Authority: Municipal Commissioner, Pune"
        ),
        classification_result="Occupancy / Completion Certificate",
        issue_date=datetime(2019, 3, 12),
        is_demo=True,
    )
    db.add(doc_a2)
    db.flush()

    for fname, fval in [
        ("institution_name", "Sunrise Institute of Technology"),
        ("certificate_number", "MCP-OCC-2019-4521"),
        ("issue_date", "12/03/2019"),
        ("issuing_authority", "Municipal Commissioner, Pune"),
        ("address", "Survey No. 45, Baner Road, Pune - 411045"),
    ]:
        db.add(ExtractedField(
            document_id=doc_a2.id,
            field_name=fname,
            field_label=fname.replace("_", " ").title(),
            extracted_value=fval,
            effective_value=fval,
            confidence_label="high",
            source_page=1,
        ))

    # Satellite map uploaded
    doc_a3 = Document(
        id=_uuid("doc-a-sat"),
        application_id=app_a.id,
        document_type_code="SATELLITE_MAP",
        document_type_name="Satellite Map with GPS Coordinates",
        original_filename="location_map.png",
        stored_filename="demo_satellite.png",
        file_path="demo/demo_satellite.png",
        file_size_bytes=125000,
        mime_type="image/png",
        file_hash=hashlib.sha256(b"demo-satellite-map-data").hexdigest(),
        status=DocumentStatus.EXTRACTED,
        uploaded_by_id=inst_user.id,
        page_count=1,
        has_digital_text=False,
        extraction_method="tesseract_ocr",
        extracted_text="Latitude: 18.5628, Longitude: 73.8004\nSunrise Institute of Technology\nBaner Road, Pune",
        classification_result="Satellite / Location Map",
        is_demo=True,
    )
    db.add(doc_a3)
    db.flush()

    # Findings for Scenario A
    findings_a = [
        ValidationFinding(
            id=_uuid("finding-a-miss-aff"),
            application_id=app_a.id,
            finding_type=FindingType.MISSING_DOCUMENT,
            status=ValidationStatus.FAIL,
            severity=FindingSeverity.CRITICAL,
            title="Required document missing: Affidavit 2",
            description=(
                "The document 'Affidavit 2 (Chairman/Secretary, Rs. 100 e-stamp, DSC)' is required for "
                "Extension of Approval — Self-Disclosure but has not been uploaded."
            ),
            evidence_field="document_checklist",
            evidence_value="Document type 'AFFIDAVIT_2' not found",
            expected_value="'Affidavit 2' uploaded and processable",
            handbook_ref="APH 2024-27, Annexure 2, Section 2.1(i); Chapter II, Clause 2.3.4(b)",
            recommended_action=(
                "Upload a valid Affidavit 2, digitally signed by the Chairman/Secretary, "
                "on Rs.100 e-stamp paper as required by Annexure 2, Section 2.1(i)."
            ),
            review_status="open",
        ),
        ValidationFinding(
            id=_uuid("finding-a-miss-fire"),
            application_id=app_a.id,
            finding_type=FindingType.MISSING_DOCUMENT,
            status=ValidationStatus.FAIL,
            severity=FindingSeverity.CRITICAL,
            title="Required document missing: Fire Safety Certificate",
            description=(
                "The document 'Fire Safety Certificate' is required for "
                "Extension of Approval — Self-Disclosure but has not been uploaded."
            ),
            evidence_field="document_checklist",
            evidence_value="Document type 'FIRE_SAFETY_CERTIFICATE' not found",
            handbook_ref="APH 2024-27, Annexure 2, Section 2.1(v)",
            recommended_action="Upload a valid Fire Safety Certificate from the Competent Authority.",
            review_status="open",
        ),
        ValidationFinding(
            id=_uuid("finding-a-miss-audit"),
            application_id=app_a.id,
            finding_type=FindingType.MISSING_DOCUMENT,
            status=ValidationStatus.FAIL,
            severity=FindingSeverity.HIGH,
            title="Required document missing: Audited Statement of Accounts",
            description=(
                "The document 'Audited Statement of Accounts (Previous Year)' is required for "
                "Extension of Approval — Self-Disclosure but has not been uploaded."
            ),
            evidence_field="document_checklist",
            evidence_value="Document type 'AUDITED_ACCOUNTS' not found",
            handbook_ref="APH 2024-27, Annexure 2, Section 2.1(vii)",
            recommended_action="Upload the previous year's audited accounts of the Trust/Society/Company.",
            review_status="open",
        ),
    ]
    for f in findings_a:
        db.add(f)

    # ─── Scenario B: Expired Certificate ─────────────────────────────────────
    app_b = Application(
        id=_uuid("app-scenario-b"),
        reference_number="RT-DEMO-2024-002",
        institution_id=inst.id,
        category_id=cat_eoa_sd.id,
        academic_year="2024-25",
        status=ApplicationStatus.UNDER_REVIEW,
        validation_status=ValidationStatus.FAIL,
        created_by_id=inst_user.id,
        assigned_reviewer_id=reviewer.id,
        submitted_at=_now() - timedelta(days=10),
        next_action="Request renewed Fire Safety Certificate. Current certificate has expired.",
        is_demo=True,
    )
    db.add(app_b)
    db.flush()

    # All docs uploaded including expired fire cert
    for code, name, fname, content, issue_dt, expiry_dt, doc_hash in [
        ("AFFIDAVIT_2", "Affidavit 2", "affidavit2_demo.pdf",
         "AFFIDAVIT 2\nSunrise Institute of Technology\nDate of Issue: 01/03/2024\nValid Until: 28/02/2025",
         datetime(2024, 3, 1), datetime(2025, 2, 28), b"demo-aff2-data-b"),
        ("TER_PAYMENT_RECEIPT", "TER Payment Receipt", "ter_demo.pdf",
         "TER Payment Receipt\nSunrise Institute of Technology\nIssued: 10/04/2024\nAmount: Rs. 20,000",
         datetime(2024, 4, 10), None, b"demo-ter-data-b"),
        ("OCCUPANCY_CERTIFICATE", "Occupancy Certificate", "occ_demo.pdf",
         "Occupancy Certificate\nSunrise Institute of Technology\nIssued: 12/03/2019",
         datetime(2019, 3, 12), None, b"demo-occ-data-b"),
        ("SATELLITE_MAP", "Satellite Map", "map_demo.png",
         "Latitude: 18.5628\nLongitude: 73.8004", None, None, b"demo-map-data-b"),
        ("AUDITED_ACCOUNTS", "Audited Accounts", "audit_demo.pdf",
         "Audited Statement of Accounts 2022-23\nSunrise Education Trust",
         datetime(2023, 9, 30), None, b"demo-audit-data-b"),
    ]:
        doc = Document(
            id=_uuid(f"doc-b-{code}"),
            application_id=app_b.id,
            document_type_code=code,
            document_type_name=name,
            original_filename=fname,
            stored_filename=f"demo_{fname}",
            file_path=f"demo/demo_{fname}",
            file_size_bytes=55000,
            mime_type="application/pdf" if fname.endswith(".pdf") else "image/png",
            file_hash=hashlib.sha256(doc_hash).hexdigest(),
            status=DocumentStatus.EXTRACTED,
            uploaded_by_id=inst_user.id,
            page_count=1,
            has_digital_text=True,
            extraction_method="digital_text",
            extracted_text=content,
            classification_result=name,
            issue_date=issue_dt,
            expiry_date=expiry_dt,
            is_demo=True,
        )
        db.add(doc)
        db.flush()

        db.add(ExtractedField(
            document_id=doc.id,
            field_name="institution_name",
            field_label="Institution Name",
            extracted_value="Sunrise Institute of Technology",
            effective_value="Sunrise Institute of Technology",
            confidence_label="high",
            source_page=1,
        ))
        if issue_dt:
            db.add(ExtractedField(
                document_id=doc.id,
                field_name="issue_date",
                field_label="Issue Date",
                extracted_value=issue_dt.strftime("%d/%m/%Y"),
                effective_value=issue_dt.strftime("%d/%m/%Y"),
                confidence_label="medium",
                source_page=1,
            ))
        if expiry_dt:
            db.add(ExtractedField(
                document_id=doc.id,
                field_name="expiry_date",
                field_label="Expiry Date",
                extracted_value=expiry_dt.strftime("%d/%m/%Y"),
                effective_value=expiry_dt.strftime("%d/%m/%Y"),
                confidence_label="medium",
                source_page=1,
            ))

    # Expired fire cert
    fire_doc_b = Document(
        id=_uuid("doc-b-fire"),
        application_id=app_b.id,
        document_type_code="FIRE_SAFETY_CERTIFICATE",
        document_type_name="Fire Safety Certificate",
        original_filename="fire_safety_cert_expired.pdf",
        stored_filename="demo_fire_expired.pdf",
        file_path="demo/demo_fire_expired.pdf",
        file_size_bytes=62000,
        mime_type="application/pdf",
        file_hash=hashlib.sha256(b"demo-fire-expired-data-b").hexdigest(),
        status=DocumentStatus.EXTRACTED,
        uploaded_by_id=inst_user.id,
        page_count=1,
        has_digital_text=True,
        extraction_method="digital_text",
        extracted_text=(
            "FIRE SAFETY CERTIFICATE\nPune Municipal Corporation\n"
            "Certificate No: PMC-FIRE-2022-8841\n"
            "Issued to: Sunrise Institute of Technology\n"
            "Survey No. 45, Baner Road, Pune - 411045\n"
            "Issue Date: 15/07/2022\n"
            "Valid Until: 14/07/2023\n"
            "Fire Officer: Shri A.K. Patil"
        ),
        classification_result="Fire Safety Certificate",
        issue_date=datetime(2022, 7, 15),
        expiry_date=datetime(2023, 7, 14),
        is_demo=True,
    )
    db.add(fire_doc_b)
    db.flush()

    for fname, fval in [
        ("institution_name", "Sunrise Institute of Technology"),
        ("certificate_number", "PMC-FIRE-2022-8841"),
        ("issue_date", "15/07/2022"),
        ("expiry_date", "14/07/2023"),
        ("issuing_authority", "Fire Officer, Pune Municipal Corporation"),
    ]:
        db.add(ExtractedField(
            document_id=fire_doc_b.id,
            field_name=fname,
            field_label=fname.replace("_", " ").title(),
            extracted_value=fval,
            effective_value=fval,
            confidence_label="high",
            source_page=1,
        ))

    db.add(ValidationFinding(
        id=_uuid("finding-b-fire-expired"),
        application_id=app_b.id,
        document_id=fire_doc_b.id,
        finding_type=FindingType.EXPIRED_DOCUMENT,
        status=ValidationStatus.FAIL,
        severity=FindingSeverity.CRITICAL,
        title="Document appears expired: Fire Safety Certificate",
        description=(
            "The extracted expiry date '14/07/2023' (text extracted, heuristic confidence) "
            f"is before today ({_now().strftime('%d %b %Y')}). "
            "This is a preliminary finding subject to extraction accuracy."
        ),
        evidence_field="expiry_date",
        evidence_value="14/07/2023",
        expected_value=f"Date on or after {_now().strftime('%d %b %Y')}",
        handbook_ref="APH 2024-27, Annexure 2, Section 2.1(v)",
        recommended_action="Request an updated, valid Fire Safety Certificate from the Competent Authority.",
        review_status="open",
    ))

    # Verification attempt for fire cert — source unavailable
    db.add(VerificationAttempt(
        document_id=fire_doc_b.id,
        method="api",
        source_name="Pune Municipal Corporation Portal",
        status=VerificationStatus.SOURCE_UNAVAILABLE,
        error_reason="No authorized integration configured for Pune Municipal Corporation portal. Source unavailable — demo mode.",
        notes="Automated source verification is unavailable in the current demo. Route for manual verification.",
    ))

    # ─── Scenario C: Cross-document mismatch ──────────────────────────────────
    app_c = Application(
        id=_uuid("app-scenario-c"),
        reference_number="RT-DEMO-2024-003",
        institution_id=inst.id,
        category_id=cat_eoa_sd.id,
        academic_year="2024-25",
        status=ApplicationStatus.UNDER_REVIEW,
        validation_status=ValidationStatus.WARNING,
        created_by_id=inst_user.id,
        assigned_reviewer_id=reviewer.id,
        submitted_at=_now() - timedelta(days=8),
        next_action="Clarify institution name inconsistency between Affidavit 2 and Audited Accounts.",
        is_demo=True,
    )
    db.add(app_c)
    db.flush()

    doc_c_aff = Document(
        id=_uuid("doc-c-aff"),
        application_id=app_c.id,
        document_type_code="AFFIDAVIT_2",
        document_type_name="Affidavit 2",
        original_filename="affidavit2_c.pdf",
        stored_filename="demo_aff2_c.pdf",
        file_path="demo/demo_aff2_c.pdf",
        file_size_bytes=48000,
        mime_type="application/pdf",
        file_hash=hashlib.sha256(b"demo-aff2-c-data").hexdigest(),
        status=DocumentStatus.EXTRACTED,
        uploaded_by_id=inst_user.id,
        page_count=1,
        has_digital_text=True,
        extraction_method="digital_text",
        extracted_text=(
            "AFFIDAVIT 2\nI, the undersigned Chairman of Sunrise Institute of Technology, Pune, "
            "hereby declare...\nDate: 01/04/2024\nValid Until: 31/03/2025"
        ),
        classification_result="Affidavit (Sworn Statement)",
        issue_date=datetime(2024, 4, 1),
        expiry_date=datetime(2025, 3, 31),
        is_demo=True,
    )
    db.add(doc_c_aff)
    db.flush()

    for fname, fval in [
        ("institution_name", "Sunrise Institute of Technology"),
        ("issue_date", "01/04/2024"),
        ("expiry_date", "31/03/2025"),
    ]:
        db.add(ExtractedField(
            document_id=doc_c_aff.id,
            field_name=fname,
            field_label=fname.replace("_", " ").title(),
            extracted_value=fval,
            effective_value=fval,
            confidence_label="high",
            source_page=1,
        ))

    doc_c_audit = Document(
        id=_uuid("doc-c-audit"),
        application_id=app_c.id,
        document_type_code="AUDITED_ACCOUNTS",
        document_type_name="Audited Statement of Accounts",
        original_filename="audit_accounts_c.pdf",
        stored_filename="demo_audit_c.pdf",
        file_path="demo/demo_audit_c.pdf",
        file_size_bytes=95000,
        mime_type="application/pdf",
        file_hash=hashlib.sha256(b"demo-audit-c-data").hexdigest(),
        status=DocumentStatus.EXTRACTED,
        uploaded_by_id=inst_user.id,
        page_count=3,
        has_digital_text=True,
        extraction_method="digital_text",
        extracted_text=(
            "Audited Balance Sheet 2022-23\n"
            "SUNRISE EDUCATIONAL TRUST\n"  # Different name!
            "Registered office: Survey No. 45, Baner Road, Pune\n"
            "Chartered Accountant: M/s. Sharma & Associates"
        ),
        classification_result="Audited Accounts Statement",
        issue_date=datetime(2023, 9, 30),
        is_demo=True,
    )
    db.add(doc_c_audit)
    db.flush()

    for fname, fval in [
        ("institution_name", "SUNRISE EDUCATIONAL TRUST"),  # Mismatch!
        ("issue_date", "30/09/2023"),
    ]:
        db.add(ExtractedField(
            document_id=doc_c_audit.id,
            field_name=fname,
            field_label=fname.replace("_", " ").title(),
            extracted_value=fval,
            effective_value=fval,
            confidence_label="medium",
            source_page=1,
        ))

    db.add(ValidationFinding(
        id=_uuid("finding-c-mismatch"),
        application_id=app_c.id,
        document_id=doc_c_aff.id,
        finding_type=FindingType.FIELD_MISMATCH,
        status=ValidationStatus.WARNING,
        severity=FindingSeverity.HIGH,
        title="Institution name inconsistency across documents",
        description=(
            "The institution name in 'Affidavit 2' ('Sunrise Institute of Technology') "
            "differs significantly from 'Audited Statement of Accounts' ('SUNRISE EDUCATIONAL TRUST'). "
            "This may indicate different entities, an abbreviation, or a data-entry discrepancy."
        ),
        evidence_field="institution_name",
        evidence_value="Sunrise Institute of Technology",
        compared_with_doc_id=doc_c_audit.id,
        compared_field="institution_name",
        compared_value="SUNRISE EDUCATIONAL TRUST",
        recommended_action="Review both documents and confirm whether they refer to the same institution. The Trust name and Institution name may legitimately differ — verify.",
        review_status="open",
    ))

    # ─── Scenario D: Duplicate / Anomaly ─────────────────────────────────────
    app_d = Application(
        id=_uuid("app-scenario-d"),
        reference_number="RT-DEMO-2024-004",
        institution_id=inst.id,
        category_id=cat_eoa_sd.id,
        academic_year="2024-25",
        status=ApplicationStatus.DEFICIENCY_RAISED,
        validation_status=ValidationStatus.WARNING,
        created_by_id=inst_user.id,
        assigned_reviewer_id=reviewer.id,
        submitted_at=_now() - timedelta(days=12),
        next_action="Investigate duplicate Fire Safety Certificate file. Route for human verification.",
        is_demo=True,
    )
    db.add(app_d)
    db.flush()

    # Two docs with the same hash (exact duplicate)
    dup_hash = hashlib.sha256(b"demo-duplicate-file-content").hexdigest()
    for i, (code, name) in enumerate([
        ("FIRE_SAFETY_CERTIFICATE", "Fire Safety Certificate"),
        ("OCCUPANCY_CERTIFICATE", "Occupancy Certificate — DUPLICATE FILE"),  # Same file reused
    ]):
        doc = Document(
            id=_uuid(f"doc-d-{i}"),
            application_id=app_d.id,
            document_type_code=code,
            document_type_name=name,
            original_filename=f"document_{i+1}.pdf",
            stored_filename=f"demo_dup_{i+1}.pdf",
            file_path=f"demo/demo_dup_{i+1}.pdf",
            file_size_bytes=72000,
            mime_type="application/pdf",
            file_hash=dup_hash,
            status=DocumentStatus.EXTRACTED,
            uploaded_by_id=inst_user.id,
            page_count=2,
            has_digital_text=True,
            extraction_method="digital_text",
            extracted_text="Certificate Document\nSunrise Institute of Technology\nDate: 10/03/2024",
            classification_result=name,
            issue_date=datetime(2024, 3, 10),
            is_demo=True,
        )
        db.add(doc)

    db.flush()

    docs_d = db.query(Document).filter(Document.application_id == app_d.id).all()
    if len(docs_d) >= 2:
        db.add(ValidationFinding(
            id=_uuid("finding-d-dup"),
            application_id=app_d.id,
            document_id=docs_d[0].id,
            finding_type=FindingType.DUPLICATE_DETECTED,
            status=ValidationStatus.WARNING,
            severity=FindingSeverity.HIGH,
            title=f"Duplicate file detected: {docs_d[0].document_type_name}",
            description=(
                f"The file '{docs_d[0].original_filename}' (SHA-256: {dup_hash[:16]}...) "
                f"is an exact byte-for-byte duplicate of '{docs_d[1].original_filename}'. "
                f"This is a PRELIMINARY FLAG — not a conclusion of fraud or irregularity."
            ),
            evidence_field="file_hash",
            evidence_value=dup_hash,
            compared_with_doc_id=docs_d[1].id,
            recommended_action=(
                "Verify that the same file has not been submitted for two different document requirements. "
                "Request the correct document for the incorrectly mapped requirement."
            ),
            review_status="open",
        ))

    # Also add an anomaly flag (issue date in future — synthetic)
    db.add(ValidationFinding(
        id=_uuid("finding-d-anomaly"),
        application_id=app_d.id,
        finding_type=FindingType.ANOMALY_FLAG,
        status=ValidationStatus.MANUAL_REVIEW_REQUIRED,
        severity=FindingSeverity.HIGH,
        title="Potential document anomaly — verification required",
        description=(
            "Metadata analysis of the uploaded file suggests an inconsistency in creation timestamps. "
            "The file's embedded metadata indicates a modification date that precedes its stated issue date. "
            "This is a PRELIMINARY FLAG based on technical metadata — not proof of any irregularity. "
            "Human verification is required."
        ),
        evidence_field="file_metadata",
        evidence_value="Document metadata: creation_date=2023-01-10, stated_issue_date=2024-03-10",
        recommended_action=(
            "Route this finding for human review. Request the original document from the issuing authority "
            "for verification. Do not treat this flag as proof of fraud."
        ),
        review_status="open",
    ))

    # ─── Scenario H: Alerts ───────────────────────────────────────────────────
    # Add notifications for relevant users
    notifications = [
        Notification(
            user_id=reviewer.id,
            application_id=app_a.id,
            title="Missing Required Documents — RT-DEMO-2024-001",
            message="Application RT-DEMO-2024-001 has 3 missing required documents including Affidavit 2 and Fire Safety Certificate.",
            severity=AlertSeverity.CRITICAL,
            action_url="/applications/RT-DEMO-2024-001",
        ),
        Notification(
            user_id=reviewer.id,
            application_id=app_b.id,
            finding_id=_uuid("finding-b-fire-expired"),
            title="Expired Document — Fire Safety Certificate (RT-DEMO-2024-002)",
            message="Fire Safety Certificate in application RT-DEMO-2024-002 appears expired (14/07/2023). Request renewal.",
            severity=AlertSeverity.CRITICAL,
            action_url="/applications/RT-DEMO-2024-002",
        ),
        Notification(
            user_id=reviewer.id,
            application_id=app_c.id,
            title="Institution Name Mismatch — RT-DEMO-2024-003",
            message="Cross-document inconsistency detected in RT-DEMO-2024-003: Institution name differs between Affidavit 2 and Audited Accounts.",
            severity=AlertSeverity.HIGH,
            action_url="/applications/RT-DEMO-2024-003",
        ),
        Notification(
            user_id=reviewer.id,
            application_id=app_d.id,
            title="Duplicate File & Anomaly Flag — RT-DEMO-2024-004",
            message="Exact duplicate file detected across two document slots and a potential metadata anomaly in RT-DEMO-2024-004.",
            severity=AlertSeverity.HIGH,
            action_url="/applications/RT-DEMO-2024-004",
        ),
        Notification(
            user_id=inst_user.id,
            application_id=app_a.id,
            title="Action Required: Upload Missing Documents",
            message="Your application RT-DEMO-2024-001 is pending 3 required documents. Please upload them to proceed.",
            severity=AlertSeverity.CRITICAL,
            action_url="/applications/RT-DEMO-2024-001",
        ),
    ]
    for n in notifications:
        db.add(n)

    # Infrastructure compliance observation (Scenario G)
    db.add(ComplianceObservation(
        application_id=app_b.id,
        category="infrastructure",
        observation=(
            "Infrastructure Evidence Checklist: Building and infrastructure certificates submitted. "
            "Floor plan not uploaded. Photographs uploaded (3 images). "
            "Note: Physical inspection by EVC remains with the competent authority. "
            "This system provides preliminary documentation review only."
        ),
        status=ValidationStatus.WARNING,
        severity=FindingSeverity.MEDIUM,
        handbook_ref="APH 2024-27, Chapter II, Clause 2.3.5; Chapter VI",
        evidence="Floor plan document type not found in uploaded documents.",
        recommended_action=(
            "Upload building/floor plan drawings approved by the Competent Authority. "
            "Physical inspection and verification of infrastructure remains with the EVC."
        ),
    ))

    db.commit()
    print("[SUCCESS] Database seeded successfully with demo data.")
    print("\n  Demo credentials (local development only):")
    print("  +---------------+------------------------------+--------------+")
    print("  | Role          | Email                        | Password     |")
    print("  +---------------+------------------------------+--------------+")
    print("  | Administrator | admin@ruletrace.demo         | Admin@123    |")
    print("  | Reviewer      | reviewer@ruletrace.demo      | Reviewer@123 |")
    print("  | Institution   | institution@ruletrace.demo   | Inst@123     |")
    print("  | Audit Viewer  | auditor@ruletrace.demo       | Audit@123    |")
    print("  +---------------+------------------------------+--------------+")
    print("  [NOTE] All data is SYNTHETIC. Do not use real institutional data in demo.\n")

"""
RuleTrace AI — Document Processing Service

Handles:
- Text extraction from digital PDFs (PyMuPDF)
- OCR from scanned PDFs and images (Tesseract)
- Structured field extraction
- File hash computation for duplicate detection
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF


# ─────────────────────────────── File Hashing ────────────────────────────────

def compute_sha256(file_path: Path) -> str:
    """Compute SHA-256 hash of a file for duplicate detection."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ─────────────────────────────── PDF Text Extraction ─────────────────────────

def extract_text_from_pdf(file_path: Path) -> Tuple[str, bool, int]:
    """
    Extract text from a PDF using PyMuPDF.

    Returns:
        (text, has_digital_text, page_count)
        has_digital_text = True if meaningful text was found without OCR.
    """
    try:
        doc = fitz.open(str(file_path))
        page_count = len(doc)
        all_text_parts = []
        char_count = 0

        for page in doc:
            text = page.get_text("text")
            all_text_parts.append(text)
            char_count += len(text.strip())

        doc.close()
        full_text = "\n\n".join(all_text_parts)
        # Heuristic: more than 100 characters per page on average means digital text
        has_digital_text = (page_count > 0) and (char_count / page_count >= 100)
        return full_text, has_digital_text, page_count
    except Exception as e:
        return f"[PDF extraction error: {e}]", False, 0


def extract_text_from_image_with_tesseract(file_path: Path) -> Tuple[str, str]:
    """
    Run Tesseract OCR on an image or scanned PDF page.

    Returns:
        (text, method_note)
    """
    try:
        import pytesseract
        from PIL import Image
        from app.core.config import settings

        if settings.TESSERACT_CMD and settings.TESSERACT_CMD != "tesseract":
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            # Render first page for OCR
            doc = fitz.open(str(file_path))
            if len(doc) == 0:
                return "", "tesseract_ocr"
            page = doc[0]
            mat = fitz.Matrix(2, 2)  # 2x zoom for better OCR
            pix = page.get_pixmap(matrix=mat)
            doc.close()
            img_path = file_path.with_suffix(".ocr_tmp.png")
            pix.save(str(img_path))
            text = pytesseract.image_to_string(Image.open(img_path), lang="eng")
            img_path.unlink(missing_ok=True)
        else:
            text = pytesseract.image_to_string(Image.open(str(file_path)), lang="eng")

        return text, "tesseract_ocr"
    except ImportError:
        return "[Tesseract not available — install pytesseract and Tesseract-OCR]", "none"
    except Exception as e:
        return f"[OCR error: {e}]", "ocr_failed"


def process_document(file_path: Path) -> Dict[str, Any]:
    """
    Main document processing entry point.

    Returns a dict with:
      extracted_text, has_digital_text, page_count, extraction_method
    """
    suffix = file_path.suffix.lower()
    result: Dict[str, Any] = {
        "extracted_text": "",
        "has_digital_text": False,
        "page_count": 1,
        "extraction_method": "none",
    }

    if suffix == ".pdf":
        text, has_digital, page_count = extract_text_from_pdf(file_path)
        result["page_count"] = page_count

        if has_digital:
            result["extracted_text"] = text
            result["has_digital_text"] = True
            result["extraction_method"] = "digital_text"
        else:
            # Fall back to OCR
            ocr_text, method = extract_text_from_image_with_tesseract(file_path)
            # Use whichever produced more text
            if len(ocr_text) > len(text):
                result["extracted_text"] = ocr_text
                result["extraction_method"] = method
            else:
                result["extracted_text"] = text
                result["extraction_method"] = "digital_text_low_confidence"

    elif suffix in {".png", ".jpg", ".jpeg"}:
        ocr_text, method = extract_text_from_image_with_tesseract(file_path)
        result["extracted_text"] = ocr_text
        result["extraction_method"] = method
    elif suffix in {".txt", ".text"}:
        # Plain text file — read directly (used by synthetic sample documents)
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                txt = f.read()
            result["extracted_text"] = txt
            result["has_digital_text"] = True
            result["extraction_method"] = "plain_text"
        except Exception as exc:
            result["extracted_text"] = f"[Text read error: {exc}]"
            result["extraction_method"] = "none"
    elif suffix in {".doc", ".docx"}:
        # Word document — try python-docx if available
        try:
            import docx as _docx
            doc = _docx.Document(str(file_path))
            txt = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            result["extracted_text"] = txt
            result["has_digital_text"] = bool(txt)
            result["extraction_method"] = "docx"
        except ImportError:
            result["extracted_text"] = "[python-docx not installed — cannot read .docx]"
            result["extraction_method"] = "none"
        except Exception as exc:
            result["extracted_text"] = f"[DOCX read error: {exc}]"
            result["extraction_method"] = "none"
    else:
        result["extracted_text"] = "[Unsupported file type for text extraction]"
        result["extraction_method"] = "none"

    return result


# ─────────────────────────────── Field Extraction ────────────────────────────

# Date patterns — ordered from most specific to least
_DATE_PATTERNS = [
    r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b",       # DD/MM/YYYY or DD-MM-YYYY
    r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})\b",
    r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{1,2})[\s,]+(\d{4})\b",
    r"\b(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})\b",           # YYYY-MM-DD
]

_MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _try_parse_date(text: str) -> Optional[datetime]:
    """Attempt to parse a date string using multiple patterns."""
    for pattern in _DATE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            try:
                groups = m.groups()
                if len(groups) == 3:
                    g = [str(x) for x in groups]
                    # DD/MM/YYYY style
                    if re.match(r"\d{1,2}", g[0]) and re.match(r"\d{1,2}", g[1]) and len(g[2]) == 4:
                        return datetime(int(g[2]), int(g[1]), int(g[0]))
                    # DD Mon YYYY
                    if re.match(r"\d{1,2}", g[0]) and g[1].lower()[:3] in _MONTH_MAP:
                        return datetime(int(g[2]), _MONTH_MAP[g[1].lower()[:3]], int(g[0]))
                    # Mon DD YYYY
                    if g[0].lower()[:3] in _MONTH_MAP:
                        return datetime(int(g[2]), _MONTH_MAP[g[0].lower()[:3]], int(g[1]))
                    # YYYY-MM-DD
                    if len(g[0]) == 4:
                        return datetime(int(g[0]), int(g[1]), int(g[2]))
            except (ValueError, IndexError):
                continue
    return None


def extract_structured_fields(text: str, document_type_code: str) -> List[Dict[str, Any]]:
    """
    Extract structured fields from document text based on document type.

    Returns a list of dicts: {field_name, field_label, extracted_value, confidence_label, source_hint}

    Confidence labels:
      "high"        — strong pattern match
      "medium"      — plausible pattern match
      "low"         — weak / heuristic match
      "unavailable" — field not found or extraction engine did not provide calibrated confidence
    Note: These are HEURISTIC labels, not calibrated probabilities.
    """
    fields: List[Dict[str, Any]] = []

    def _add(name: str, label: str, value: Optional[str], conf: str = "medium") -> None:
        fields.append({
            "field_name": name,
            "field_label": label,
            "extracted_value": value.strip() if value else None,
            "confidence_label": conf if value else "unavailable",
            "source_hint": "text_extraction_heuristic",
        })

    lines = text.split("\n")
    text_lower = text.lower()

    # ── Institution name ─────────────────────────────────────────────────────
    inst_name = None
    for pattern in [
        r"(?:name\s+of\s+(?:the\s+)?institution|institution\s+name)[:\s]+(.+)",
        r"(?:college|institute|university|school)\s+of\s+[A-Z].{5,60}",
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            inst_name = m.group(1) if m.lastindex else m.group(0)
            break
    _add("institution_name", "Institution Name", inst_name)

    # ── Certificate / Reference number ───────────────────────────────────────
    cert_num = None
    for pattern in [
        r"(?:certificate\s+no|cert\.?\s*no|reference\s+no|reg\.?\s*no|registration\s+number)[.:\s]+([A-Z0-9\/\-]{4,30})",
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            cert_num = m.group(1)
            break
    _add("certificate_number", "Certificate / Reference Number", cert_num)

    # ── Issue date ───────────────────────────────────────────────────────────
    issue_date_val = None
    for pattern in [
        r"(?:date\s+of\s+issue|issued?\s+(?:on|date)|issue\s+date)[:\s]+(.{5,25})",
        r"(?:this\s+certificate\s+is\s+issued\s+on)[:\s]+(.{5,25})",
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            issue_date_val = m.group(1).strip()
            break
    _add("issue_date", "Issue Date", issue_date_val, "medium" if issue_date_val else "unavailable")

    # ── Expiry / validity date ───────────────────────────────────────────────
    expiry_val = None
    for pattern in [
        r"(?:valid\s+(?:up\s+to|till|until|upto)|expiry\s+date|expires?\s+(?:on)?|validity)[:\s]+(.{5,25})",
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            expiry_val = m.group(1).strip()
            break
    _add("expiry_date", "Expiry / Valid Until", expiry_val, "medium" if expiry_val else "unavailable")

    # ── Issuing authority ────────────────────────────────────────────────────
    authority = None
    for pattern in [
        r"(?:issued\s+by|issuing\s+authority|authority)[:\s]+(.{5,80})",
        r"(?:fire\s+officer|municipal\s+commissioner|building\s+officer|competent\s+authority).{0,30}",
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            authority = m.group(1) if m.lastindex else m.group(0)
            break
    _add("issuing_authority", "Issuing Authority", authority)

    # ── Address ──────────────────────────────────────────────────────────────
    address = None
    for pattern in [
        r"(?:address)[:\s]+(.{10,150})",
        r"(?:located\s+at|situated\s+at)[:\s]+(.{10,100})",
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            address = m.group(1).strip()
            break
    _add("address", "Address", address, "low")

    # ── Document-type-specific fields ────────────────────────────────────────

    # Fire Safety / NOC documents
    if "fire" in document_type_code.lower() or "fire" in text_lower[:500]:
        noc_val = None
        m = re.search(
            r"(?:fire\s+noc\s+no|fire\s+noc|noc\s+no|no\s+objection\s+certificate)[:\s]+([A-Z0-9\/\-]{4,30})",
            text, re.IGNORECASE
        )
        if m:
            noc_val = m.group(1).strip()
        else:
            m2 = re.search(r"(?:no\s+objection|NOC|fire\s+safety\s+certificate)", text, re.IGNORECASE)
            if m2:
                noc_val = "Fire Safety Certificate / NOC"
        _add("noc_number", "NOC / Certificate Number", noc_val, "high" if noc_val else "unavailable")
        _add("document_classification", "Document Classification", "Fire Safety Certificate / NOC", "high")

    # Land Ownership / Deed documents
    if "land" in document_type_code.lower() or "land area" in text_lower:
        land_area = None
        m = re.search(
            r"(?:land\s+area|total\s+area)[:\s]+([\d,\.]+\s*(?:acres?|hectares?|sqm|sq\.?\s*m))",
            text, re.IGNORECASE
        )
        if m:
            land_area = m.group(1).strip()
        _add("land_area", "Land Area", land_area, "high" if land_area else "unavailable")

        survey = None
        m = re.search(r"(?:survey\s+nos?|survey\s+number)[:\s]+(.{5,80})", text, re.IGNORECASE)
        if m:
            survey = m.group(1).strip()[:80]
        _add("survey_numbers", "Survey Numbers", survey, "medium" if survey else "unavailable")

        built_up = None
        m = re.search(
            r"(?:built[- ]?up\s+area)[:\s]+([\d,\.]+\s*(?:sqm|sq\.?\s*m|sq\s+ft|sft))",
            text, re.IGNORECASE
        )
        if m:
            built_up = m.group(1).strip()
        _add("built_up_area", "Built-up Area", built_up, "medium" if built_up else "unavailable")

    # Affiliation NOC (University)
    if "affiliation" in document_type_code.lower() or "affiliat" in text_lower[:500]:
        univ = None
        for pat in [
            r"(?:affiliated\s+to|affiliating\s+university|university\s+name)[:\s]+(.{5,100})",
            r"(?:savitribai\s+phule|anna\s+university|vtu|sppu|msbte).{0,50}",
        ]:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                univ = (m.group(1) if m.lastindex else m.group(0)).strip()[:100]
                break
        _add("affiliating_university", "Affiliating University", univ, "high" if univ else "unavailable")

        affil_no = None
        m = re.search(r"(?:affiliation\s+number|affiliation\s+no)[:\s]+([A-Z0-9\/\-]{4,40})", text, re.IGNORECASE)
        if m:
            affil_no = m.group(1).strip()
        _add("affiliation_number", "Affiliation Number", affil_no, "medium" if affil_no else "unavailable")

    # Bank Guarantee / FDR documents
    if "bank" in document_type_code.lower() or "fdr" in text_lower[:400] or "fixed deposit" in text_lower[:400]:
        fdr_amount = None
        m = re.search(
            r"(?:fdr\s+amount|deposit\s+amount|amount)[:\s]+(Rs\.?\s*[\d,]+(?:\/\-)?(?:\s*\(.*?\))?)",
            text, re.IGNORECASE
        )
        if m:
            fdr_amount = m.group(1).strip()[:80]
        _add("fdr_amount", "FDR / Deposit Amount", fdr_amount, "high" if fdr_amount else "unavailable")

        fdr_no = None
        m = re.search(r"(?:fdr\s+no|fd\s+no|fdr\s+number|account\s+no)[:\s]+([A-Z0-9\/\-]{4,40})", text, re.IGNORECASE)
        if m:
            fdr_no = m.group(1).strip()
        _add("fdr_number", "FDR / Account Number", fdr_no, "medium" if fdr_no else "unavailable")

        bank_name = None
        m = re.search(r"(?:bank\s+name|bank)[:\s]+(.{5,60})", text, re.IGNORECASE)
        if m:
            bank_name = m.group(1).strip()[:60]
        _add("bank_name", "Bank Name", bank_name, "medium" if bank_name else "unavailable")

    # Affidavit documents
    if "affidavit" in document_type_code.lower() or "affidavit" in text_lower[:300]:
        stamp_paper = None
        m = re.search(
            r"(Rs\.?\s*100|hundred\s+rupees|e-stamp(?:\s+reference)?[:\s]+[A-Z0-9\-]+|non[\s-]judicial\s+stamp)",
            text, re.IGNORECASE
        )
        if m:
            stamp_paper = m.group(0).strip()[:80]
        _add("stamp_paper_value", "Stamp Paper / e-Stamp Reference", stamp_paper, "high" if stamp_paper else "unavailable")

        notary = None
        m = re.search(r"(?:notarized\s+by|notary)[:\s]+([\w\s,\.]+?)(?:\n|$)", text, re.IGNORECASE)
        if m:
            notary = m.group(1).strip()[:80]
        else:
            m2 = re.search(r"(?:notary|judicial\s+magistrate|oath\s+commissioner)[\s\w,]*", text, re.IGNORECASE)
            if m2:
                notary = m2.group(0).strip()[:80]
        _add("notarized_by", "Notarized By", notary, "high" if notary else "unavailable")

        notary_reg = None
        m = re.search(r"(?:notary\s+registration\s+no|notary\s+reg)[.:\s]+([A-Z0-9\/\-]{4,30})", text, re.IGNORECASE)
        if m:
            notary_reg = m.group(1).strip()
        _add("notary_registration", "Notary Registration Number", notary_reg, "medium" if notary_reg else "unavailable")

    # Building Plan documents
    if "building" in document_type_code.lower() or "building plan" in text_lower[:400]:
        architect = None
        m = re.search(r"(?:architect)[:\s]+(.{5,80})", text, re.IGNORECASE)
        if m:
            architect = m.group(1).strip()[:80]
        _add("architect_name", "Architect / Structural Engineer", architect, "medium" if architect else "unavailable")

        floors = None
        m = re.search(r"(?:number\s+of\s+floors?|no\s+of\s+floors?)[:\s]+(.{2,30})", text, re.IGNORECASE)
        if m:
            floors = m.group(1).strip()[:30]
        _add("number_of_floors", "Number of Floors", floors, "medium" if floors else "unavailable")

    return fields


def classify_document(text: str, filename: str) -> str:
    """
    Heuristic document classification based on text content and filename.
    Returns a human-readable classification string.
    """
    text_lower = (text + filename).lower()

    classifiers = [
        ("Affidavit (Sworn Statement)", ["affidavit", "sworn", "judicial magistrate", "notary", "stamp paper"]),
        ("Fire Safety Certificate", ["fire safety", "fire noc", "fire certificate", "fire officer"]),
        ("Occupancy / Completion Certificate", ["occupancy certificate", "completion certificate", "building license", "form d"]),
        ("Structural Stability Certificate", ["structural stability", "structural engineer", "fit for human habitation"]),
        ("Audited Accounts Statement", ["audited statement", "balance sheet", "chartered accountant", "audit report"]),
        ("NOC from Affiliating University", ["no objection certificate", "noc", "affiliating university", "university board"]),
        ("TER Payment Receipt", ["ter charges", "technical education regulatory", "payment receipt", "aicte web-portal"]),
        ("Trust/Society Resolution", ["resolution of the trust", "resolution of the society", "chairman", "secretary", "format 3"]),
        ("Building Plan", ["building plan", "floor plan", "architect", "council of architecture"]),
        ("Satellite / Location Map", ["satellite map", "latitude", "longitude", "geographical location"]),
        ("NBA Accreditation Certificate", ["nba", "national board of accreditation", "accreditation certificate"]),
        ("NAAC Certificate", ["naac", "national assessment and accreditation", "naac score"]),
    ]

    for label, keywords in classifiers:
        if any(k in text_lower for k in keywords):
            return label

    return "Unclassified Document"

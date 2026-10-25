# Contributing to RuleTrace AI

Thank you for your interest in contributing to **RuleTrace AI** (SIH 2026 Problem Statement: SIH26261)! We welcome contributions from developers, researchers, and regulatory domain specialists.

---

## 🏛️ Project Overview
- **Team**: UNCUT GEMS
- **Hackathon**: Smart India Hackathon 2026
- **Problem Statement**: SIH26261 — AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification
- **Target Organization**: All India Council for Technical Education (AICTE)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python**: 3.10+ (tested on Python 3.10, 3.11, 3.12)
- **Node.js**: 18+ (tested on Node.js 18, 20)
- **OCR Engine (Optional)**: Tesseract OCR installed locally if testing scanned image OCR.

### 2. Fork and Clone
```bash
git clone https://github.com/<your-username>/ruletrace.git
cd ruletrace
```

### 3. Setup Virtual Environment & Backend
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 4. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```

---

## 🧪 Testing & Quality Assurance

Before submitting any Pull Request, ensure that all automated checks pass cleanly:

### Backend Testing
```bash
cd backend
python -m pytest
```
All API tests and validation engine assertions must pass (6/6 passing).

### Frontend Linting & Build
```bash
cd frontend
npm run lint
npm run build
```
Verify that ESLint returns 0 errors and `next build` compiles successfully.

---

## 🌿 Branching & Commit Conventions

- Create descriptive feature branches:
  - `feat/<feature-name>` for new capabilities
  - `fix/<bug-name>` for bug fixes
  - `docs/<doc-update>` for documentation enhancements
  - `test/<test-name>` for additional test suites
- Keep commit messages concise, imperative, and descriptive:
  - Example: `feat: add FDR lien marking validation rule for APH Chapter II`
  - Example: `fix: cross-institution document duplicate hash detection`

---

## 📜 Regulatory Consistency

Any updates to the validation engine, document schemas, or deficiency generation must cross-reference official AICTE Approval Process Handbook (APH 2024–2027) guidelines:
- Chapter I: Grant of Approval for Technical Institutions
- Chapter II: Grant of Approval for Extension of Approval (EoA)
- Annexure 2: Document Verification Checklist & Format Specs
- Appendix 4: Norms for Land and Built-up Area Requirements

---

## 💬 Code of Conduct

Maintain a collaborative, professional, and respectful environment. Be constructive in code reviews and issue discussions.

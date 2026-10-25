# Security Policy — RuleTrace AI

## 🔒 Supported Versions

RuleTrace AI is an active prototype developed for **Smart India Hackathon 2026** (Problem Statement SIH26261). Security updates are applied to the active `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🛡️ Security Architecture in RuleTrace AI

RuleTrace AI is built with regulatory compliance and document security in mind:

1. **Cryptographic SHA-256 Hashing**:
   - Every uploaded document receives an immutable SHA-256 checksum at ingestion.
   - Cross-application duplicate detection checks for illicit document recycling across distinct institutions.

2. **Tamper-Evident Audit Logging**:
   - Every system action (document upload, validation run, discrepancy resolution, status transition, reviewer sign-off) is appended to an immutable audit trail with actor details, timestamps, and IP metadata.

3. **Role-Based Access Control (RBAC)**:
   - Discrete role authorization:
     - `institution`: Can only submit and view their own applications and draft documents.
     - `reviewer`: Can inspect deficiencies, review extracted clauses, approve/reject, or request resubmission.
     - `administrator`: Full tenant overview, connector management, rule editing, and user provisioning.
     - `audit_viewer`: Read-only compliance auditor with cryptographic export capabilities.

4. **Synthetic Test Data Guardrail**:
   - All sample documents, college names, certificate numbers, and FDR records provided in this repository are **100% synthetic and fabricated** for demonstration and benchmarking purposes. No real, confidential institutional or student data is stored.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within RuleTrace AI:

1. **Do not create a public GitHub issue.**
2. Send an email with vulnerability details, proof-of-concept steps, and affected components to the team leads at:
   - `team.uncutgems.sih@gmail.com`
3. We will acknowledge receipt within 48 hours and work with you on a coordinated fix and advisory.

---

## ⚠️ Production Deployment Recommendations

When deploying RuleTrace AI beyond prototype/hackathon environments:
- Replace default `SECRET_KEY` in `.env` with a cryptographically secure 256-bit key.
- Transition from local SQLite to an encrypted PostgreSQL cluster (with TLS and Row Level Security enabled).
- Mount an S3-compatible object store (e.g., AWS S3, MinIO) with server-side KMS encryption for document storage.
- Enforce HTTPS and strict CORS origin whitelisting.

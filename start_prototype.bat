@echo off
echo ======================================================================
echo RuleTrace AI - SIH 2026 Prototype
echo AI-Powered Regulatory Compliance Verification for AICTE APH 2024-2027
echo ======================================================================

echo Starting RuleTrace AI Backend (FastAPI on http://localhost:8000)...
start "RuleTrace AI Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo Starting RuleTrace AI Frontend (Next.js on http://localhost:3000)...
start "RuleTrace AI Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================================================
echo RuleTrace AI is launching!
echo Backend API Docs: http://localhost:8000/docs
echo Scrutiny Portal: http://localhost:3000
echo ======================================================================

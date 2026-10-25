"""RuleTrace AI — FastAPI Main Application Entrypoint

AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification
Smart India Hackathon 2026 | Problem ID: SIH26261
"""
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import Base, SessionLocal, engine
from app.db.seed import seed_database
from app.api.routes import (
    auth,
    institutions,
    categories,
    applications,
    documents,
    validation,
    rules,
    verification,
    notifications,
    dashboard,
    reports,
    audit,
    users,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ruletrace")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Seed initial demo data
    try:
        db = SessionLocal()
        seed_database(db)
        db.close()
        logger.info("Database seeded successfully.")
    except Exception as e:
        logger.warning(f"Database seed note: {e}")

    # Ensure upload directory exists
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="RuleTrace AI API",
    description="AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification under AICTE APH 2024-2027",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api/v1
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(institutions.router, prefix=API_PREFIX)
app.include_router(categories.router, prefix=API_PREFIX)
app.include_router(applications.router, prefix=API_PREFIX)
app.include_router(documents.router, prefix=API_PREFIX)
app.include_router(validation.router, prefix=API_PREFIX)
app.include_router(rules.router, prefix=API_PREFIX)
app.include_router(verification.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(audit.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RuleTrace AI Backend",
        "version": "1.0.0",
        "compliance_standard": "AICTE Approval Process Handbook (APH 2024-2027)",
    }

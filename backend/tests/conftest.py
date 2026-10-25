"""RuleTrace AI — Pytest Configuration & Test Fixtures"""
import pytest
from app.core.config import settings
from app.db.database import Base, SessionLocal, engine
from app.db.seed import seed_database


@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """Ensure database tables and initial seed data exist before running tests."""
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

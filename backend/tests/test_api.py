"""RuleTrace AI — Automated API & Validation Tests"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.models.models import Application, User, ValidationFinding

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "AICTE" in data["compliance_standard"]


def test_admin_login():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ruletrace.demo", "password": "Admin@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "administrator"


def test_reviewer_login():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@ruletrace.demo", "password": "Reviewer@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "reviewer"


def test_categories_and_checklist():
    # Login as reviewer
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@ruletrace.demo", "password": "Reviewer@123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List categories
    res = client.get("/api/v1/categories", headers=headers)
    assert res.status_code == 200
    categories = res.json()
    assert len(categories) > 0

    cat_id = categories[0]["id"]
    checklist_res = client.get(f"/api/v1/categories/{cat_id}/checklist", headers=headers)
    assert checklist_res.status_code == 200
    checklist = checklist_res.json()
    assert len(checklist) > 0


def test_list_applications():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@ruletrace.demo", "password": "Reviewer@123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/applications", headers=headers)
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) > 0


def test_validation_and_report_generation():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@ruletrace.demo", "password": "Reviewer@123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get first application
    apps_res = client.get("/api/v1/applications", headers=headers)
    app_id = apps_res.json()[0]["id"]

    # Trigger validation
    val_res = client.post(f"/api/v1/applications/{app_id}/validate", headers=headers)
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert "total_checks" in val_data

    # Generate Scrutiny Report
    rep_res = client.post(f"/api/v1/applications/{app_id}/reports/generate", headers=headers)
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert "content" in rep_data
    assert "findings" in rep_data["content"]

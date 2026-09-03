"""Unit and integration tests for FastAPI backend endpoints."""
import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "llm_configured" in data


def test_static_pages():
    assert client.get("/").status_code == 200
    assert client.get("/jobs").status_code == 200
    assert client.get("/dashboard").status_code == 200
    assert client.get("/profile").status_code == 200


def test_profile_parse():
    response = client.post(
        "/api/profile/parse",
        data={
            "resume_text": "Experienced Python Backend Engineer with FastAPI, Docker, and SQL experience.",
            "target_roles": "Backend Engineer, Python Developer",
            "locations": "Remote",
            "work_mode": "remote",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "skills" in data
    assert any("python" in s.lower() for s in data["skills"])


def test_jobs_search():
    payload = {
        "resume_text": "Software Engineer with Python, Docker, and FastAPI.",
        "target_roles": ["GenAI Engineer"],
        "locations": ["Remote"],
        "work_mode": "remote",
        "limit": 5,
    }
    response = client.post("/api/jobs/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "profile" in data
    assert "matches" in data
    assert len(data["matches"]) > 0
    assert "score" in data["matches"][0]


def test_jobs_tailor():
    payload = {
        "job_id": "sample-1",
        "resume_text": "Python Engineer with FastAPI, Docker, and SQL.",
    }
    response = client.post("/api/jobs/tailor", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "tailored_resume" in data
    assert "cover_letter" in data
    assert len(data["tailored_resume"]["bullets"]) > 0
    assert len(data["cover_letter"]["content"]) > 0


def test_jobs_prep():
    payload = {
        "job_id": "sample-1",
        "resume_text": "Python Engineer with FastAPI, Docker, and SQL.",
    }
    response = client.post("/api/jobs/prep", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "interview_prep" in data
    assert "markdown" in data
    assert len(data["interview_prep"]["likely_questions"]) > 0


def test_tracker_lifecycle():
    # 1. Get dashboard summary
    dash = client.get("/api/tracker/dashboard")
    assert dash.status_code == 200
    dash_data = dash.json()
    assert "summary" in dash_data

    # 2. Track new application
    new_app = {
        "job_id": "test-fastapi-1",
        "job_title": "AI Integration Specialist",
        "company": "Stitch Dynamics",
        "location": "Remote",
        "url": "https://example.com/jobs/test-fastapi-1",
        "fit_score": 92.5,
        "status": "saved",
        "notes": "FastAPI Integration Test",
    }
    create_res = client.post("/api/tracker/applications", json=new_app)
    assert create_res.status_code == 200
    created = create_res.json()
    app_id = created["id"]
    assert app_id is not None

    # 3. Update status to tailored
    patch_res = client.patch(f"/api/tracker/applications/{app_id}/status", json={"status": "tailored"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "tailored"

    # 4. List all applications
    list_res = client.get("/api/tracker/applications")
    assert list_res.status_code == 200
    apps = list_res.json()
    assert any(a["id"] == app_id for a in apps)

    # 5. Delete application
    del_res = client.delete(f"/api/tracker/applications/{app_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

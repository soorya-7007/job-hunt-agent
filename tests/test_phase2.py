"""Phase 2 tests — key-free (no API keys, no model downloads needed).

These exercise the honesty guardrail (critic), the honest fallback (heuristic
tailoring), and the tracker's CRUD round-trip. The tracker test skips itself if
SQLAlchemy isn't installed.
"""
import pytest

from app.agents.critic import critique
from app.agents.tailoring_agent import tailor_resume
from app.schemas import CandidateProfile, JobPosting, TailoredResume


def test_critic_flags_unsupported_skill():
    """A draft that claims skills absent from the resume must fail the critic."""
    resume = "Experienced Python developer. Built Flask APIs and used SQL databases."
    draft = TailoredResume(
        job_id="1",
        summary="Python and Kubernetes expert.",
        bullets=["Deployed microservices with Docker and Kubernetes."],
    )
    result = critique(draft, resume)
    assert result.passed is False
    joined = " ".join(result.flagged).lower()
    assert "kubernetes" in joined
    assert "docker" in joined


def test_critic_passes_when_grounded():
    """A draft using only real resume skills must pass cleanly."""
    resume = "Python developer. Built Flask APIs, used SQL, and containerized with Docker."
    draft = TailoredResume(
        job_id="1",
        summary="Python developer skilled in Flask and SQL.",
        bullets=["Built Flask APIs backed by SQL.", "Containerized services with Docker."],
    )
    result = critique(draft, resume)
    assert result.passed is True
    assert result.flagged == []


def test_word_boundary_no_false_positive():
    """'git' in the resume must not falsely 'support' unrelated words; the checker
    uses whole-word matching so 'digital' does not count as 'git'."""
    resume = "Worked on digital products."  # contains 'git' as a substring only
    draft = TailoredResume(job_id="1", summary="Used git for version control.", bullets=[])
    result = critique(draft, resume)
    assert result.passed is False
    assert any("git" in f.lower() for f in result.flagged)


def test_heuristic_tailoring_never_fabricates(monkeypatch):
    """With no LLM, the template fallback must only surface skills the candidate has,
    so its own output always passes the critic."""
    from app.config import settings

    monkeypatch.setattr(settings, "has_llm", lambda: False)
    profile = CandidateProfile(summary="Backend developer.", skills=["python", "sql", "docker"])
    job = JobPosting(
        id="42",
        title="Backend Engineer",
        company="Acme",
        description="We use Python, SQL, Docker, and Kubernetes.",
    )
    resume = "Backend developer skilled in Python, SQL, and Docker."
    draft = tailor_resume(profile, job, resume)

    assert draft.bullets  # produced something
    assert critique(draft, resume).passed is True  # and it's honest


def test_tracker_roundtrip(tmp_path):
    """save -> list -> update -> upsert -> delete against a temp SQLite file."""
    pytest.importorskip("sqlalchemy")
    from app.schemas import Application
    from app.tools import tracker

    tracker.configure(tmp_path / "test.db")

    saved = tracker.save_application(
        Application(job_id="job-1", job_title="ML Engineer", company="DataForge",
                    fit_score=88.0, status="tailored", tailored_bullets=["Did X", "Did Y"])
    )
    assert saved.id is not None

    apps = tracker.list_applications()
    assert len(apps) == 1 and apps[0].job_title == "ML Engineer"
    assert apps[0].tailored_bullets == ["Did X", "Did Y"]

    tracker.update_status(saved.id, "applied")
    assert tracker.list_applications()[0].status == "applied"

    # Upsert by job_id: same job updates, does not duplicate.
    tracker.save_application(Application(job_id="job-1", job_title="ML Engineer II"))
    assert len(tracker.list_applications()) == 1

    assert tracker.delete_application(saved.id) is True
    assert tracker.list_applications() == []

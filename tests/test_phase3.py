"""Phase 3 tests — key-free unit and integration tests.

Tests cover:
  - Company-Prep Agent: interview questions, grounded answers, and Markdown export
  - Search tool: offline resilience and graceful degradation
  - Tailoring Agent: cover letter generation
  - Tracker Agent: dashboard pipeline metrics and pending action items
  - LangGraph Supervisor: end-to-end search and job-prep workflows with tracing hooks
"""
import pytest

from app.agents import company_prep_agent, tailoring_agent, tracker_agent
from app.orchestrator.graph import (
    build_supervisor_graph,
    run_job_prep_workflow,
    run_search_workflow,
)
from app.schemas import CandidateProfile, JobPosting
from app.tools import search, tracker


@pytest.fixture
def sample_profile():
    return CandidateProfile(
        name="Alex Mercer",
        summary="Backend and GenAI Engineer experienced in Python, FastAPI, and Docker.",
        skills=["python", "fastapi", "docker", "sql", "pytorch"],
        years_experience=3.5,
        target_roles=["GenAI Engineer", "Backend Developer"],
        locations=["Remote"],
    )


@pytest.fixture
def sample_job():
    return JobPosting(
        id="job-99",
        source="sample",
        title="GenAI Engineer",
        company="Nexus AI",
        location="Remote",
        description="Looking for an engineer with Python, FastAPI, Docker, and LangChain to build agents.",
    )


def test_company_prep_heuristic_grounded(sample_profile, sample_job):
    """Company-Prep agent must produce structured, grounded prep guides without an LLM."""
    prep = company_prep_agent.generate_interview_prep(
        sample_profile,
        sample_job,
        resume_text=sample_profile.summary,
    )

    assert prep.job_id == sample_job.id
    assert prep.company == sample_job.company
    assert len(prep.likely_questions) >= 3
    assert len(prep.key_talking_points) >= 2
    assert len(prep.questions_to_ask_interviewer) >= 2

    # Verify categories and answer presence
    categories = {q.category for q in prep.likely_questions}
    assert "technical" in categories
    assert "behavioral" in categories

    # Verify Markdown export
    md = prep.to_markdown()
    assert f"# Interview Preparation: {sample_job.title} at {sample_job.company}" in md
    assert "## 🏢 Company & Role Overview" in md
    assert "## 💬 Likely Interview Questions & Grounded Answers" in md


def test_company_prep_with_mocked_llm(monkeypatch, sample_profile, sample_job):
    """Verify LLM parsing path for interview prep."""
    from app import llm
    from app.config import settings

    monkeypatch.setattr(settings, "has_llm", lambda: True)

    mock_response = {
        "company_overview": "Nexus AI builds autonomous workflow tools.",
        "key_talking_points": ["3.5 years in backend Python and GenAI", "Production FastAPI services"],
        "likely_questions": [
            {
                "question": "How do you handle schema validation in FastAPI?",
                "category": "technical",
                "suggested_answer": "I use Pydantic models for strict payload validation.",
                "talking_points": ["Pydantic v2 performance", "Clear HTTP error codes"],
            }
        ],
        "questions_to_ask_interviewer": ["What LLM observability stack do you use?"],
    }

    monkeypatch.setattr(llm, "chat_json", lambda sys, user, model=None: mock_response)

    prep = company_prep_agent.generate_interview_prep(sample_profile, sample_job)
    assert prep.company_overview == "Nexus AI builds autonomous workflow tools."
    assert len(prep.likely_questions) == 1
    assert prep.likely_questions[0].question == "How do you handle schema validation in FastAPI?"
    assert prep.likely_questions[0].talking_points == ["Pydantic v2 performance", "Clear HTTP error codes"]


def test_search_tool_graceful_fallback():
    """Web search tool must return safe summary when network is down or query is generic."""
    # Test blank / generic query
    info = search.search_company("")
    assert "company" in info.lower()

    # Test unknown query returns string without exception
    info2 = search.search_company("Acme Robotics Unknown Corp 1234567")
    assert isinstance(info2, str)
    assert len(info2) > 0


def test_cover_letter_drafting(sample_profile, sample_job):
    """Tailoring agent must generate a coherent cover letter reflecting candidate's actual skills."""
    cl = tailoring_agent.draft_cover_letter(sample_profile, sample_job)
    assert cl.job_id == sample_job.id
    assert sample_job.company in cl.content
    assert sample_job.title in cl.content
    assert "Dear Hiring Team" in cl.content
    # Profile skills should appear in the text
    assert any(s in cl.content.lower() for s in ["python", "fastapi", "docker", "sql"])


def test_tracker_agent_summary_and_pending(tmp_path, sample_job, sample_profile):
    """Tracker agent must accurately summarize pipeline counts and pending tasks."""
    tracker.configure(tmp_path / "tracker_test.db")

    # Initial state should be 0
    summary = tracker_agent.get_pipeline_summary()
    assert summary["total"] == 0

    # Track a job as 'saved'
    tracker_agent.track_job(sample_job, fit_score=85.0, status="saved")

    summary = tracker_agent.get_pipeline_summary()
    assert summary["total"] == 1
    assert summary["by_status"]["saved"] == 1
    assert summary["high_fit_count"] == 1

    actions = tracker_agent.get_pending_actions()
    assert len(actions) == 1
    assert "Tailor resume" in actions[0]["action"]

    # Transition to tailored
    apps = tracker_agent.get_all_applications()
    tracker_agent.update_application_stage(apps[0].id, "tailored")

    actions_after = tracker_agent.get_pending_actions()
    assert "Submit application" in actions_after[0]["action"]


def test_langgraph_supervisor_search_workflow():
    """LangGraph supervisor graph executes Profile -> Discovery -> Matching pipeline."""
    resume_text = (
        "Senior Python Engineer with 4 years experience building ML pipelines, "
        "FastAPI microservices, and Docker deployments. Target role: ML Engineer."
    )
    result = run_search_workflow(resume_text, preferences={"target_roles": ["ML Engineer"]}, limit=5)

    assert result.get("profile") is not None
    assert len(result["profile"].skills) > 0
    assert len(result.get("jobs", [])) > 0
    assert len(result.get("matches", [])) > 0
    assert result.get("current_step") == "jobs_matched"

    # Messages log should capture traces from supervisor
    messages = result.get("messages", [])
    assert any("ProfileAgent" in m for m in messages)
    assert any("DiscoveryAgent" in m for m in messages)
    assert any("MatchingAgent" in m for m in messages)


def test_langgraph_supervisor_job_prep_workflow(sample_profile, sample_job, tmp_path):
    """LangGraph supervisor workflow executes Tailoring and Company-Prep subflow."""
    tracker.configure(tmp_path / "supervisor_test.db")

    result = run_job_prep_workflow(
        sample_profile,
        sample_job,
        resume_text=sample_profile.summary,
        auto_track=True,
    )

    assert result.get("tailored_resume") is not None
    assert result["tailored_resume"].critique is not None
    assert result["tailored_resume"].critique.passed is True

    assert result.get("cover_letter") is not None
    assert sample_job.company in result["cover_letter"].content

    assert result.get("interview_prep") is not None
    assert len(result["interview_prep"].likely_questions) > 0

    assert result.get("current_step") == "tracked"

    # Verify tracker persisted
    apps = tracker.list_applications()
    assert len(apps) == 1
    assert apps[0].job_id == sample_job.id

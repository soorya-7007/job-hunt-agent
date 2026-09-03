import pytest
from app.schemas import CandidateProfile, JobPosting
from app.agents.tailoring_agent import tailor_resume

def test_tailoring_agent_guardrails():
    """
    Test that the tailoring agent does not hallucinate skills.
    If the job requires React, but the profile only has Python, 
    the tailored resume MUST NOT claim React experience.
    """
    profile = CandidateProfile(
        id="cand_1",
        name="Test User",
        skills=["python", "fastapi", "sql"],
        experience=["Backend Engineer"],
        locations=["Remote"],
        work_mode="remote",
        salary_range="100k-150k"
    )
    resume_text = "Backend engineer with Python, FastAPI, and SQL experience."

    job = JobPosting(
        id="job_1", 
        title="Full Stack Developer", 
        company="TechCorp", 
        location="Remote",
        description="Must have strong React and Node.js experience.",
        url="http://example.com/job1", 
        source="mock", 
        fetched_at="2026-01-01"
    )

    tailored = tailor_resume(profile, job, resume_text)
    
    # Check for hallucinated claims
    summary_lower = tailored.summary.lower()
    bullets_lower = " ".join(tailored.bullets).lower()
    
    # 'react' should not be claimed as a strength
    # Since we are using heuristic without LLM by default in tests (unless LLM is mocked),
    # the heuristic only pulls from profile.skills
    assert "react" not in summary_lower or "targeting" in summary_lower, "Agent hallucinated React in summary!"
    
    for bullet in tailored.bullets:
        assert "react" not in bullet.lower(), "Agent hallucinated React in bullets!"

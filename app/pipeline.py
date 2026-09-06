"""Orchestrator and Supervisor entrypoints.

Phase 1 flow:  resume text --> Profile --> Discovery --> Matching
Phase 2 flow:  (one chosen job) --> Tailoring --> Critic --> [revise once] --> you approve
Phase 3 flow:  LangGraph supervisor state graph orchestrating Profile, Discovery,
               Matching, Tailoring, Company-Prep, and Tracker agents with LangSmith tracing.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from app.agents.company_prep_agent import generate_interview_prep
from app.agents.critic import critique
from app.agents.discovery_agent import discover_jobs
from app.agents.matching_agent import match_jobs
from app.agents.profile_agent import build_profile
from app.agents.tailoring_agent import tailor_resume
from app.orchestrator.graph import build_supervisor_graph, run_search_workflow
from app.schemas import (
    CandidateProfile,
    InterviewPrep,
    JobPosting,
    MatchResult,
    TailoredResume,
)


def run(
    resume_text: str,
    preferences: Optional[dict] = None,
    limit: int = 20,
    use_graph: bool = False,
) -> Tuple[CandidateProfile, List[MatchResult]]:
    """Execute the Profile -> Discovery -> Matching pipeline.

    By default uses the LangGraph supervisor workflow, with a direct fallback.
    """
    if use_graph:
        try:
            state = run_search_workflow(resume_text, preferences, limit=limit)
            profile = state.get("profile")
            matches = state.get("matches", [])
            if profile is not None:
                return profile, matches
        except Exception as exc:
            print(f"[pipeline] LangGraph search workflow fallback triggered ({exc}).")

    profile = build_profile(resume_text, preferences)
    jobs = discover_jobs(profile, limit=limit)
    matches = match_jobs(profile, jobs)
    return profile, matches


def tailor_for_job(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str,
    max_revisions: int = 1,
) -> TailoredResume:
    """Draft a tailored resume for ONE job, then self-check it for fabrication.

    This is the agentic "reflection" loop: the Tailoring Agent writes a draft, the
    critic re-reads it, and if it flags any unsupported claim we ask the writer to
    fix it (up to `max_revisions` times).
    """
    draft = tailor_resume(profile, job, resume_text)
    verdict = critique(draft, resume_text, profile)

    revisions = 0
    while not verdict.passed and revisions < max_revisions:
        feedback = "; ".join(verdict.flagged)
        draft = tailor_resume(profile, job, resume_text, feedback=feedback)
        draft.revised = True
        verdict = critique(draft, resume_text, profile)
        revisions += 1

    draft.critique = verdict
    return draft


def prep_for_job(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str = "",
) -> InterviewPrep:
    """Run Company-Prep Agent: research company and generate an interview guide."""
    return generate_interview_prep(profile, job, resume_text)


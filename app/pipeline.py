"""Orchestrator (simple sequential glue).

These functions are the precursor to the LangGraph supervisor you'll build in
Phase 3. Keeping the flow linear now makes the system easy to read, run, and test.

Phase 1 flow:  resume text --> Profile --> Discovery --> Matching
Phase 2 flow:  (one chosen job) --> Tailoring --> Critic --> [revise once] --> you approve
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from app.agents.critic import critique
from app.agents.discovery_agent import discover_jobs
from app.agents.matching_agent import match_jobs
from app.agents.profile_agent import build_profile
from app.agents.tailoring_agent import tailor_resume
from app.schemas import CandidateProfile, JobPosting, MatchResult, TailoredResume


def run(
    resume_text: str,
    preferences: Optional[dict] = None,
    limit: int = 20,
) -> Tuple[CandidateProfile, List[MatchResult]]:
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
    fix it (up to `max_revisions` times). The returned draft carries its final
    critique so the UI can show you the verdict before you approve.
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


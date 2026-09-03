"""Phase 1 orchestrator (simple sequential glue).

This one function is the precursor to the LangGraph supervisor you'll build in
Phase 3. Keeping the flow linear now makes Phase 1 easy to read, run, and test.

Flow:  resume text --> Profile Agent --> Discovery Agent --> Matching Agent
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from app.agents.discovery_agent import discover_jobs
from app.agents.matching_agent import match_jobs
from app.agents.profile_agent import build_profile
from app.schemas import CandidateProfile, MatchResult


def run(
    resume_text: str,
    preferences: Optional[dict] = None,
    limit: int = 20,
) -> Tuple[CandidateProfile, List[MatchResult]]:
    profile = build_profile(resume_text, preferences)
    jobs = discover_jobs(profile, limit=limit)
    matches = match_jobs(profile, jobs)
    return profile, matches

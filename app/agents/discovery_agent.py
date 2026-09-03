"""Discovery Agent: build a search query from the profile and fetch postings."""
from __future__ import annotations

from typing import List

from app.schemas import CandidateProfile, JobPosting
from app.tools import job_boards


def discover_jobs(profile: CandidateProfile, limit: int = 20) -> List[JobPosting]:
    query = _build_query(profile)
    location = profile.locations[0] if profile.locations else ""
    return job_boards.search_jobs(query, location=location, limit=limit)


def _build_query(profile: CandidateProfile) -> str:
    if profile.target_roles:
        return profile.target_roles[0]
    if profile.skills:
        return " ".join(profile.skills[:3])
    return "software engineer"

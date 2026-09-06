"""Discovery Agent: build a search query from the profile and fetch postings."""
from __future__ import annotations

from typing import List

from app.schemas import CandidateProfile, JobPosting
from app.tools import job_boards


def discover_jobs(profile: CandidateProfile, limit: int = 20) -> List[JobPosting]:
    roles = profile.target_roles if profile.target_roles else [_build_query(profile)]
    location = profile.locations[0] if profile.locations else ""
    
    all_jobs: List[JobPosting] = []
    seen_ids = set()
    
    for role in roles[:3]:
        postings = job_boards.search_jobs(role, location=location, limit=limit)
        for p in postings:
            if p.id not in seen_ids:
                seen_ids.add(p.id)
                all_jobs.append(p)
                
    return all_jobs[:limit] if all_jobs else job_boards.search_jobs(_build_query(profile), location=location, limit=limit)


def _build_query(profile: CandidateProfile) -> str:
    if profile.target_roles:
        return profile.target_roles[0]
    if profile.skills:
        return " ".join(profile.skills[:3])
    return "software engineer"

"""Matching Agent: score each job against the profile.

Scoring = semantic similarity (local embeddings) + optional LLM reasoning.
Skill-gap detection is a simple lexical check against the job description.
"""
from __future__ import annotations

from typing import List

from app import llm
from app.agents.profile_agent import SKILL_HINTS
from app.config import settings
from app.schemas import CandidateProfile, JobPosting, MatchResult
from app.tools import embeddings

REASON_SYSTEM = (
    "You are a career assistant. Given a candidate profile and a job, explain in at "
    "most two sentences why it is or isn't a good fit. Be concrete and honest."
)


def match_jobs(profile: CandidateProfile, jobs: List[JobPosting]) -> List[MatchResult]:
    if not jobs:
        return []

    profile_vec = embeddings.embed([profile.to_text()])[0]
    job_vecs = embeddings.embed([j.to_text() for j in jobs])

    results: List[MatchResult] = []
    for job, jvec in zip(jobs, job_vecs):
        sim = embeddings.cosine_sim(profile_vec, jvec)
        score = round(max(0.0, min(1.0, sim)) * 100, 1)
        gaps = _skill_gaps(profile, job)
        reasons = _llm_reason(profile, job) if settings.has_llm() else _template_reason(score, gaps)
        results.append(MatchResult(job=job, score=score, reasons=reasons, gaps=gaps))

    results.sort(key=lambda r: r.score, reverse=True)
    return results


def _skill_gaps(profile: CandidateProfile, job: JobPosting) -> List[str]:
    have = {s.lower() for s in profile.skills}
    text = job.to_text().lower()
    gaps = [skill for skill in SKILL_HINTS if skill in text and skill not in have]
    return gaps[:6]


def _template_reason(score: float, gaps: List[str]) -> str:
    reason = f"Semantic fit score {score}/100."
    if gaps:
        reason += " Possible skill gaps: " + ", ".join(gaps) + "."
    return reason


def _llm_reason(profile: CandidateProfile, job: JobPosting) -> str:
    user = f"Candidate:\n{profile.to_text()}\n\nJob:\n{job.to_text()[:2000]}"
    try:
        return llm.chat(REASON_SYSTEM, user)
    except Exception as exc:
        return f"(LLM reasoning unavailable: {exc})"

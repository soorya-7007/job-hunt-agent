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

    target_role_lower = profile.target_roles[0].lower() if profile.target_roles else ""
    is_fresher_search = any(kw in target_role_lower for kw in ["fresher", "junior", "entry level", "entry-level"])
    senior_keywords = ["senior", "lead", "principal", "manager", "director", "head", "architect"]

    results: List[MatchResult] = []
    for job, jvec in zip(jobs, job_vecs):
        title_lower = job.title.lower()
        
        if is_fresher_search:
            exp = job.experience_level
            try:
                if exp is not None and float(exp) > 24:
                    continue
            except (ValueError, TypeError):
                pass
            if any(sk in title_lower for sk in senior_keywords):
                continue

        sim = embeddings.cosine_sim(profile_vec, jvec)
        score = max(0.0, min(1.0, sim)) * 100.0
        
        if target_role_lower:
            if target_role_lower in title_lower:
                score += 20.0
            elif any(word in title_lower for word in target_role_lower.split() if len(word) > 3):
                score += 10.0
                
        score = round(min(100.0, score), 1)
        
        gaps = _skill_gaps(profile, job)
        reasons = _template_reason(score, gaps, profile, job)
        results.append(MatchResult(job=job, score=score, reasons=reasons, gaps=gaps))

    results.sort(key=lambda r: r.score, reverse=True)
    return results


def _skill_gaps(profile: CandidateProfile, job: JobPosting) -> List[str]:
    have = {s.lower() for s in profile.skills}
    text = job.to_text().lower()
    gaps = [skill for skill in SKILL_HINTS if skill in text and skill not in have]
    return gaps[:6]


def _template_reason(score: float, gaps: List[str], profile: CandidateProfile | None = None, job: JobPosting | None = None) -> str:
    matched = []
    if profile and job:
        jtext = job.to_text().lower()
        matched = [s for s in profile.skills if s.lower() in jtext]

    if matched:
        reason = f"Strong semantic alignment ({score}% fit) with your skills in {', '.join(matched[:3])}."
    else:
        reason = f"Calculated semantic fit score of {score}% based on your profile summary."

    if gaps:
        reason += f" Identified skill requirements to verify: {', '.join(gaps[:3])}."
    else:
        reason += " No critical skill gaps identified."
    return reason


def _llm_reason(profile: CandidateProfile, job: JobPosting) -> str:
    user = f"Candidate:\n{profile.to_text()}\n\nJob:\n{job.to_text()[:2000]}"
    try:
        return llm.chat(REASON_SYSTEM, user)
    except Exception as exc:
        return f"(LLM reasoning unavailable: {exc})"

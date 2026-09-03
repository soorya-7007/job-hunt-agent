"""Tailoring Agent: rewrite the candidate's summary + key bullets for ONE job.

The whole point of this agent is *honest* tailoring. It may rephrase, reorder,
and emphasise experience that already exists in the resume so it mirrors the job
description's language — but it must NEVER invent skills, tools, employers,
projects, degrees, or metrics.

That rule is enforced two ways:
  1. The prompt below states it explicitly.
  2. A separate critic (app/agents/critic.py) re-reads the draft and flags any
     unsupported claim. The pipeline uses that feedback to ask for one rewrite.

Like the rest of the app, it works with zero API keys (a simple, honest template
fallback) and gets much better when an LLM is configured.
"""
from __future__ import annotations

from typing import List, Optional

from app import llm
from app.agents.profile_agent import SKILL_HINTS
from app.config import settings
from app.schemas import CandidateProfile, JobPosting, TailoredResume

TAILOR_SYSTEM = (
    "You are an expert technical resume writer. Rewrite a candidate's professional "
    "summary and a few achievement bullet points so they target ONE specific job.\n"
    "ABSOLUTE RULES:\n"
    "1. Use ONLY facts, skills, tools, and experience found in the candidate's resume.\n"
    "2. Never invent employers, projects, metrics, degrees, or skills.\n"
    "3. You MAY rephrase, reorder, and emphasise real experience to match the job.\n"
    "4. Prefer the job description's wording when the candidate has the equivalent "
    "experience.\n"
    "Keep the summary to 2-3 sentences and write 3-5 bullets, each starting with a "
    "strong action verb."
)


def tailor_resume(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str,
    feedback: str = "",
) -> TailoredResume:
    """Produce a tailored summary + bullets for `job`.

    `feedback` is passed on a second attempt (from the critic) telling the writer
    which unsupported claims to remove.
    """
    if settings.has_llm():
        try:
            return _tailor_with_llm(profile, job, resume_text, feedback)
        except Exception as exc:  # never crash the demo — degrade gracefully
            print(f"[tailoring_agent] LLM tailoring failed ({exc}); using template.")
    return _tailor_heuristic(profile, job, resume_text)


def jd_keywords(job: JobPosting) -> List[str]:
    """Known skills mentioned in the job description (its 'target language')."""
    text = job.to_text().lower()
    return [s for s in SKILL_HINTS if s in text]


# --------------------------------------------------------------------------- #
# LLM path
# --------------------------------------------------------------------------- #
def _tailor_with_llm(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str,
    feedback: str,
) -> TailoredResume:
    keywords = jd_keywords(job)
    user = (
        "CANDIDATE RESUME (the only source of truth):\n"
        f"{resume_text[:6000]}\n\n"
        f"TARGET JOB: {job.title} at {job.company}\n"
        f"JOB DESCRIPTION:\n{job.description[:2500]}\n\n"
        f"JOB KEYWORDS TO MIRROR (only if the candidate truly has them): "
        f"{', '.join(keywords) or 'n/a'}\n\n"
        "Return JSON with keys: summary (string), bullets (list of 3-5 strings), "
        "keywords_covered (list of strings actually reflected from the resume)."
    )
    if feedback:
        user += (
            "\n\nIMPORTANT — a reviewer flagged the previous draft for these "
            "unsupported claims. Remove or rephrase them so EVERY statement is "
            f"backed by the resume:\n{feedback}"
        )

    data = llm.chat_json(TAILOR_SYSTEM, user)
    return TailoredResume(
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        summary=(data.get("summary") or "").strip()[:800],
        bullets=[str(b).strip() for b in data.get("bullets", []) if str(b).strip()][:5],
        keywords_covered=[str(k).strip() for k in data.get("keywords_covered", []) if str(k).strip()],
    )


# --------------------------------------------------------------------------- #
# No-LLM fallback (honest by construction: only uses skills already in profile)
# --------------------------------------------------------------------------- #
def _tailor_heuristic(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str,
) -> TailoredResume:
    have = {s.lower() for s in profile.skills}
    overlap = [k for k in jd_keywords(job) if k in have]

    base = (profile.summary or resume_text).strip()[:200]
    strengths = ", ".join(overlap[:4]) if overlap else ", ".join(list(have)[:4])
    summary = base
    if strengths:
        summary += f" Targeting the {job.title} role at {job.company}, with strengths in {strengths}."

    picks = overlap or list(have)
    bullets = [f"Bring hands-on {skill} experience relevant to this role." for skill in picks[:5]]
    if not bullets:
        bullets = ["Motivated candidate aligned with this role (add an LLM key for richer tailoring)."]

    return TailoredResume(
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        summary=summary,
        bullets=bullets,
        keywords_covered=overlap,
    )

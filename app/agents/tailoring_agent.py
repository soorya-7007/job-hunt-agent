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
from app.schemas import CandidateProfile, CoverLetter, JobPosting, TailoredResume

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


COVER_LETTER_SYSTEM = (
    "You are a professional career advisor. Write a concise, compelling, 3-paragraph cover "
    "letter for a candidate targeting a specific job.\n"
    "ABSOLUTE RULES:\n"
    "1. Use ONLY skills, projects, and experiences found in the candidate's resume.\n"
    "2. Never invent employers, degrees, metrics, or technologies.\n"
    "3. Highlight real overlap between the candidate's achievements and the role's needs.\n"
    "4. Keep the tone authentic, enthusiastic, and direct."
)


def draft_cover_letter(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str = "",
) -> CoverLetter:
    """Produce an honest, targeted cover letter for ONE job."""
    if settings.has_llm():
        try:
            return _cover_letter_with_llm(profile, job, resume_text)
        except Exception as exc:
            print(f"[tailoring_agent] LLM cover letter failed ({exc}); using template.")
    return _cover_letter_heuristic(profile, job, resume_text)


def _cover_letter_with_llm(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str,
) -> CoverLetter:
    keywords = jd_keywords(job)
    user = (
        f"CANDIDATE RESUME:\n{(resume_text or profile.to_text())[:5000]}\n\n"
        f"TARGET JOB: {job.title} at {job.company}\n"
        f"DESCRIPTION:\n{job.description[:2500]}\n\n"
        f"KEY SKILLS TO HIGHLIGHT: {', '.join(keywords) or 'relevant background'}\n\n"
        "Draft a 3-paragraph tailored cover letter. Return JSON with key: content (string)."
    )
    data = llm.chat_json(COVER_LETTER_SYSTEM, user)
    content = str(data.get("content", "")).strip()
    return CoverLetter(
        job_id=job.id,
        company=job.company,
        role=job.title,
        content=content or _cover_letter_heuristic(profile, job, resume_text).content,
    )


def _cover_letter_heuristic(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str,
) -> CoverLetter:
    have = {s.lower() for s in profile.skills}
    overlap = [k for k in jd_keywords(job) if k in have]
    strengths = ", ".join(overlap[:4]) if overlap else ", ".join(list(have)[:4]) or "software engineering"

    candidate_name = profile.name or "Candidate"
    paragraphs = [
        f"Dear Hiring Team at {job.company},",
        f"I am writing to express my strong interest in the {job.title} position. "
        f"With hands-on experience in {strengths}, I am confident in my ability to deliver immediate value to your engineering team.",
        f"Throughout my background, I have developed solutions utilizing modern best practices and solving real problems. "
        f"The mission and technical focus at {job.company} align closely with my expertise and career direction.",
        f"Thank you for your time and consideration. I welcome the opportunity to discuss how my background matches the needs of {job.company}.",
        f"Sincerely,\n{candidate_name}",
    ]

    return CoverLetter(
        job_id=job.id,
        company=job.company,
        role=job.title,
        content="\n\n".join(paragraphs),
    )

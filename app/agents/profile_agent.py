"""Profile Agent: turn raw resume text + user preferences into a CandidateProfile.

With an LLM configured it does a proper structured extraction; without one it
falls back to a simple keyword heuristic so the demo still runs.
"""
from __future__ import annotations

from typing import Optional

from app import llm
from app.config import settings
from app.schemas import CandidateProfile

SYSTEM = (
    "You are a resume-parsing assistant. Extract a structured candidate profile "
    "from the resume text. Only use information actually present in the resume."
)

# Tiny skill lexicon used by the no-LLM fallback and the gap analysis.
SKILL_HINTS = [
    "python", "java", "c++", "sql", "javascript", "typescript", "react", "node",
    "fastapi", "flask", "django", "docker", "kubernetes", "aws", "gcp", "azure",
    "pytorch", "tensorflow", "langchain", "langgraph", "llm", "rag", "nlp",
    "machine learning", "deep learning", "pandas", "numpy", "git", "linux",
    "hugging face", "transformers", "vector database",
]


def build_profile(resume_text: str, preferences: Optional[dict] = None) -> CandidateProfile:
    preferences = preferences or {}
    profile = _build_with_llm(resume_text) if settings.has_llm() else _build_heuristic(resume_text)

    # User-supplied preferences override / augment what we parsed.
    if preferences.get("target_roles"):
        profile.target_roles = preferences["target_roles"]
    if preferences.get("locations"):
        profile.locations = preferences["locations"]
    if preferences.get("work_mode"):
        profile.work_mode = preferences["work_mode"]
    return profile


def _build_with_llm(resume_text: str) -> CandidateProfile:
    user = (
        "Resume text:\n" + resume_text[:6000] + "\n\n"
        "Return JSON with keys: name, email, summary, skills (list of strings), "
        "years_experience (number), target_roles (list of strings)."
    )
    try:
        data = llm.chat_json(SYSTEM, user)
    except Exception as exc:  # if the LLM call fails, degrade gracefully
        print(f"[profile_agent] LLM parse failed ({exc}); using heuristic.")
        return _build_heuristic(resume_text)

    return CandidateProfile(
        name=data.get("name"),
        email=data.get("email"),
        summary=(data.get("summary") or "")[:500],
        skills=[s.strip() for s in data.get("skills", []) if str(s).strip()],
        years_experience=data.get("years_experience"),
        target_roles=[r.strip() for r in data.get("target_roles", []) if str(r).strip()],
    )


def _build_heuristic(resume_text: str) -> CandidateProfile:
    low = resume_text.lower()
    skills = sorted({s for s in SKILL_HINTS if s in low})
    return CandidateProfile(
        summary=resume_text.strip()[:300],
        skills=skills,
        target_roles=[],
    )

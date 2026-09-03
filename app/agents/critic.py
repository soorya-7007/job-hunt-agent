"""No-fabrication critic: the agent's self-check ("reflection") step.

After the Tailoring Agent writes a draft, this critic re-reads it against the
ORIGINAL resume and flags anything the resume doesn't support. It's what makes
the writer trustworthy — and it's a concrete example of "Responsible AI by
design" you can point to in an interview.

Two layers, so it works with or without an API key:
  1. Deterministic skill check (no key needed): any known skill named in the
     tailored draft that does NOT appear in the resume is flagged. Fast, cheap,
     and impossible to "talk around" — a real guardrail.
  2. LLM critic (when configured): a second, broader opinion that can catch
     invented employers, projects, or metrics that a keyword list can't.
"""
from __future__ import annotations

import re
from typing import List, Optional

from app import llm
from app.agents.profile_agent import SKILL_HINTS
from app.config import settings
from app.schemas import CandidateProfile, CritiqueResult, TailoredResume

CRITIC_SYSTEM = (
    "You are a strict resume fact-checker. You receive a candidate's ORIGINAL "
    "resume and a TAILORED draft. List any claim in the draft (skill, tool, "
    "employer, project, metric, certification, or experience) that is NOT "
    "supported by the original resume. Do not nitpick wording — only flag genuine "
    "additions of fact. Return JSON: {\"fabrications\": [\"...\", ...]}. If every "
    "claim is supported, return an empty list."
)


def critique(
    tailored: TailoredResume,
    resume_text: str,
    profile: Optional[CandidateProfile] = None,
) -> CritiqueResult:
    """Check a tailored draft for anything the resume doesn't back up."""
    draft_text = tailored.to_text().lower()
    resume_low = resume_text.lower()

    flags: List[str] = [
        f"'{skill}' is highlighted in the tailored draft but does not appear in your resume."
        for skill in SKILL_HINTS
        if _mentions(draft_text, skill) and not _mentions(resume_low, skill)
    ]

    if settings.has_llm():
        try:
            flags += _llm_flags(tailored, resume_text)
        except Exception as exc:
            print(f"[critic] LLM critic unavailable ({exc}); used rule-based check only.")

    flags = _dedupe(flags)
    passed = len(flags) == 0
    notes = (
        "No fabricated skills or claims detected — the draft is grounded in your resume."
        if passed
        else f"{len(flags)} item(s) need your attention before you use this draft."
    )
    return CritiqueResult(passed=passed, flagged=flags, notes=notes)


def _mentions(text: str, skill: str) -> bool:
    """Whole-word (or phrase) match, so 'git' doesn't match 'digital'."""
    skill = skill.lower()
    if " " in skill or "+" in skill or "." in skill:
        return skill in text  # phrases / special tokens: plain substring is fine
    return re.search(r"\b" + re.escape(skill) + r"\b", text) is not None


def _llm_flags(tailored: TailoredResume, resume_text: str) -> List[str]:
    user = (
        f"ORIGINAL RESUME:\n{resume_text[:6000]}\n\n"
        f"TAILORED DRAFT:\nSummary: {tailored.summary}\n"
        f"Bullets:\n- " + "\n- ".join(tailored.bullets)
    )
    data = llm.chat_json(CRITIC_SYSTEM, user)
    return [str(f).strip() for f in data.get("fabrications", []) if str(f).strip()]


def _dedupe(items: List[str]) -> List[str]:
    seen, out = set(), []
    for x in items:
        key = x.lower()
        if key not in seen:
            seen.add(key)
            out.append(x)
    return out

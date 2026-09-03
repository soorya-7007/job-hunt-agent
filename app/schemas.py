"""Pydantic data models shared across agents (structured, validated I/O)."""
from typing import List, Optional

from pydantic import BaseModel, Field


class CandidateProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    summary: str = ""
    skills: List[str] = Field(default_factory=list)
    years_experience: Optional[float] = None
    target_roles: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    work_mode: Optional[str] = None  # remote | hybrid | onsite | any

    def to_text(self) -> str:
        parts = [
            self.summary,
            "Skills: " + ", ".join(self.skills) if self.skills else "",
            "Target roles: " + ", ".join(self.target_roles) if self.target_roles else "",
        ]
        return "\n".join(p for p in parts if p)


class JobPosting(BaseModel):
    id: str
    source: str = "sample"
    title: str
    company: str = ""
    location: str = ""
    description: str = ""
    url: str = ""
    salary: Optional[str] = None
    created: Optional[str] = None

    def to_text(self) -> str:
        return f"{self.title} at {self.company}. {self.location}. {self.description}"


class MatchResult(BaseModel):
    job: JobPosting
    score: float  # 0-100 semantic fit
    reasons: str = ""
    gaps: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Phase 2 models: tailoring, the no-fabrication critic, and the tracker.
# --------------------------------------------------------------------------- #
class CritiqueResult(BaseModel):
    """Verdict from the no-fabrication critic (app/agents/critic.py).

    `flagged` lists claims in a tailored draft that are NOT supported by the
    candidate's real resume. `passed` is True only when that list is empty.
    """
    passed: bool = True
    flagged: List[str] = Field(default_factory=list)
    notes: str = ""


class TailoredResume(BaseModel):
    """A job-specific rewrite of the candidate's summary + key bullets.

    IMPORTANT: every statement here must be grounded in the real resume. The
    critic re-reads this object against the source resume to enforce that rule.
    """
    job_id: str
    job_title: str = ""
    company: str = ""
    summary: str = ""
    bullets: List[str] = Field(default_factory=list)
    keywords_covered: List[str] = Field(default_factory=list)  # JD terms reflected
    revised: bool = False  # True if the critic triggered an automatic rewrite
    critique: Optional[CritiqueResult] = None

    def to_text(self) -> str:
        """All human-readable text, used by the critic for fact-checking."""
        return self.summary + "\n" + "\n".join(self.bullets)


class Application(BaseModel):
    """One tracked job application (mirrors the SQLite `applications` table).

    Status flows: saved -> tailored -> applied -> interview -> offer -> rejected.
    """
    id: Optional[int] = None
    job_id: str
    job_title: str = ""
    company: str = ""
    location: str = ""
    url: str = ""
    fit_score: float = 0.0
    status: str = "saved"
    tailored_summary: str = ""
    tailored_bullets: List[str] = Field(default_factory=list)
    notes: str = ""
    updated_at: Optional[str] = None

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

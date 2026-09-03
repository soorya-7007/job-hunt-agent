"""Tracker Agent: manages persistence, lifecycle stages, and pipeline status.

Acts as the memory and state manager for job applications:
  - Tracks applications across pipeline stages: saved -> tailored -> applied -> interview -> offer -> rejected.
  - Generates pipeline summaries (counts by stage, high-fit opportunities).
  - Identifies pending actions (e.g. applications tailored but not yet applied, pending interview prep).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.schemas import Application, JobPosting, TailoredResume
from app.tools import tracker


def track_job(
    job: JobPosting,
    fit_score: float = 0.0,
    status: str = "saved",
    tailored_resume: Optional[TailoredResume] = None,
    notes: str = "",
) -> Application:
    """Save or update an application in the tracker database."""
    app = Application(
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        location=job.location,
        url=job.url,
        fit_score=fit_score,
        status=status,
        tailored_summary=tailored_resume.summary if tailored_resume else "",
        tailored_bullets=tailored_resume.bullets if tailored_resume else [],
        notes=notes,
    )
    return tracker.save_application(app)


def update_application_stage(app_id: int, status: str) -> Optional[Application]:
    """Transition an application to a new stage."""
    return tracker.update_status(app_id, status)


def get_all_applications() -> List[Application]:
    """Retrieve all tracked applications ordered by recency."""
    return tracker.list_applications()


def get_pipeline_summary() -> Dict[str, Any]:
    """Compute aggregate statistics across all tracked applications."""
    apps = tracker.list_applications()
    counts = {s: 0 for s in tracker.STATUSES}
    high_fit_count = 0

    for a in apps:
        if a.status in counts:
            counts[a.status] += 1
        else:
            counts[a.status] = 1
        if a.fit_score >= 80.0:
            high_fit_count += 1

    return {
        "total": len(apps),
        "by_status": counts,
        "high_fit_count": high_fit_count,
        "active_applications": counts.get("applied", 0) + counts.get("interview", 0),
    }


def get_pending_actions() -> List[Dict[str, Any]]:
    """Determine immediate actionable items for the candidate."""
    apps = tracker.list_applications()
    actions = []

    for a in apps:
        if a.status == "saved":
            actions.append(
                {
                    "app_id": a.id,
                    "job_title": a.job_title,
                    "company": a.company,
                    "action": "Tailor resume and review fit",
                    "priority": "medium",
                }
            )
        elif a.status == "tailored":
            actions.append(
                {
                    "app_id": a.id,
                    "job_title": a.job_title,
                    "company": a.company,
                    "action": "Submit application to job posting",
                    "priority": "high",
                }
            )
        elif a.status == "applied":
            actions.append(
                {
                    "app_id": a.id,
                    "job_title": a.job_title,
                    "company": a.company,
                    "action": "Prepare interview talking points & follow up",
                    "priority": "high",
                }
            )
        elif a.status == "interview":
            actions.append(
                {
                    "app_id": a.id,
                    "job_title": a.job_title,
                    "company": a.company,
                    "action": "Review Company-Prep sheet and rehearse Q&A",
                    "priority": "urgent",
                }
            )

    return actions

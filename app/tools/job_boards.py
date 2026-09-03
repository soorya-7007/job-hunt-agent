"""Tool: job discovery via the Adzuna API, with a bundled-sample fallback.

If Adzuna keys are absent (or the call fails), we return the sample postings in
data/sample_jobs.json so the app always runs, even with zero API keys.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List

import requests

from app.config import settings
from app.schemas import JobPosting

SAMPLE_PATH = Path(__file__).resolve().parents[2] / "data" / "sample_jobs.json"


def search_jobs(query: str, location: str = "", limit: int = 20) -> List[JobPosting]:
    if settings.has_adzuna():
        try:
            return _search_adzuna(query, location, limit)
        except Exception as exc:  # graceful degradation
            print(f"[job_boards] Adzuna call failed ({exc}); falling back to sample data.")
    return _load_sample(limit)


def _search_adzuna(query: str, location: str, limit: int) -> List[JobPosting]:
    country = settings.ADZUNA_COUNTRY
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "what": query,
        "where": location,
        "results_per_page": limit,
        "content-type": "application/json",
    }
    resp = requests.get(url, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    jobs: List[JobPosting] = []
    for item in data.get("results", []):
        jobs.append(
            JobPosting(
                id=str(item.get("id", "")),
                source="adzuna",
                title=item.get("title", ""),
                company=(item.get("company") or {}).get("display_name", ""),
                location=(item.get("location") or {}).get("display_name", ""),
                description=item.get("description", ""),
                url=item.get("redirect_url", ""),
                salary=_fmt_salary(item),
                created=item.get("created"),
            )
        )
    return jobs


def _fmt_salary(item: dict):
    lo, hi = item.get("salary_min"), item.get("salary_max")
    if lo and hi:
        return f"{int(lo):,} - {int(hi):,}"
    return None


def _load_sample(limit: int) -> List[JobPosting]:
    raw = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))
    return [JobPosting(**j) for j in raw][:limit]

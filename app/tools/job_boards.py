"""Tool: job discovery via the Adzuna API, with a bundled-sample fallback.

If Adzuna keys are absent (or the call fails), we return the sample postings in
data/sample_jobs.json so the app always runs, even with zero API keys.
"""
from __future__ import annotations

import html
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List

import requests

from app.config import settings
import time
from app.schemas import JobPosting

SAMPLE_PATH = Path(__file__).resolve().parents[2] / "data" / "sample_jobs.json"
_jsearch_cooldown_until = 0.0


def search_jobs(query: str, location: str = "", limit: int = 20) -> List[JobPosting]:
    # 1. Primary Live Engine: Real-time LinkedIn public job search (real live openings & actual application URLs)
    try:
        live_jobs = _search_live_linkedin(query, location, limit)
        if live_jobs:
            return live_jobs
    except Exception as exc:
        print(f"[job_boards] Live LinkedIn search error ({exc}); falling back to secondary providers.")

    # 2. Secondary Engine: RapidAPI JSearch
    global _jsearch_cooldown_until
    now = time.time()
    if settings.has_jsearch() and now > _jsearch_cooldown_until:
        try:
            return _search_jsearch(query, location, limit)
        except Exception as exc:
            print(f"[job_boards] JSearch call failed ({exc}); falling back to Adzuna/Sample.")
            if "429" in str(exc) or "404" in str(exc):
                _jsearch_cooldown_until = now + 600.0  # 10 minute cooldown on rate limit

    # 3. Tertiary Engine: Adzuna
    if settings.has_adzuna():
        try:
            return _search_adzuna(query, location, limit)
        except Exception as exc:
            print(f"[job_boards] Adzuna call failed ({exc}); falling back to sample data.")

    # 4. Fallback
    return _load_sample(limit)


def _search_live_linkedin(query: str, location: str = "", limit: int = 20) -> List[JobPosting]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    loc = location.strip() if location else "India"
    is_remote = "remote" in loc.lower() or (query and "remote" in query.lower())
    
    search_q = f"{query} Remote" if is_remote and "remote" not in query.lower() else query
    geo_loc = "India" if is_remote else loc

    url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={requests.utils.quote(search_q)}&location={requests.utils.quote(geo_loc)}&start=0"
    
    try:
        resp = requests.get(url, headers=headers, timeout=6)
        cards = re.findall(r"<div[^>]*class=\"[^\"]*base-card[^\"]*\"[^>]*>.*?</li>", resp.text, re.DOTALL) if resp.status_code == 200 else []
    except Exception:
        cards = []

    if not cards:
        # Fallback query with keywords only
        try:
            url_fallback = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={requests.utils.quote(query)}&start=0"
            resp_fallback = requests.get(url_fallback, headers=headers, timeout=6)
            if resp_fallback.status_code == 200:
                cards = re.findall(r"<div[^>]*class=\"[^\"]*base-card[^\"]*\"[^>]*>.*?</li>", resp_fallback.text, re.DOTALL)
        except Exception:
            cards = []

    jobs: List[JobPosting] = []
    
    for card in cards[:limit]:
        t_match = re.search(r"<h3[^>]*class=\"[^\"]*base-search-card__title[^\"]*\"[^>]*>\s*(.*?)\s*</h3>", card, re.DOTALL)
        title = html.unescape(t_match.group(1).strip()) if t_match else ""
        
        c_match = re.search(r"<h4[^>]*class=\"[^\"]*base-search-card__subtitle[^\"]*\"[^>]*>\s*(?:<a[^>]*>)?\s*(.*?)\s*(?:</a>)?\s*</h4>", card, re.DOTALL)
        company = html.unescape(re.sub(r"<[^>]+>", "", c_match.group(1)).strip()) if c_match else ""
        
        l_match = re.search(r"<span[^>]*class=\"job-search-card__location\"[^>]*>\s*(.*?)\s*</span>", card, re.DOTALL)
        loc_str = html.unescape(l_match.group(1).strip()) if l_match else loc
        
        u_match = re.search(r"<a[^>]*class=\"[^\"]*base-card__full-link[^\"]*\"[^>]*href=\"([^\"]*)\"", card)
        url_clean = u_match.group(1).split("?")[0] if u_match else ""
        
        id_match = re.search(r"data-entity-urn=\"urn:li:jobPosting:(\d+)\"", card)
        jid = id_match.group(1) if id_match else f"li-{len(jobs)}"
        
        d_match = re.search(r"<time[^>]*datetime=\"([^\"]*)\"", card)
        posted_date = d_match.group(1) if d_match else ""
        
        if title and company and url_clean:
            jobs.append(
                JobPosting(
                    id=f"li-{jid}",
                    source="linkedin",
                    title=title,
                    company=company,
                    location=loc_str,
                    description=f"{title} position at {company} in {loc_str}. Live opening on LinkedIn. Apply directly to view full qualifications and submit your application.",
                    url=url_clean,
                    is_remote=is_remote or "remote" in loc_str.lower(),
                    created=posted_date,
                )
            )

    # Concurrently enrich the top jobs with actual job descriptions
    def fetch_full_desc(j: JobPosting):
        raw_id = j.id.replace("li-", "")
        if not raw_id.isdigit():
            return
        try:
            r = requests.get(f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{raw_id}", headers=headers, timeout=3.5)
            m = re.search(r"<div class=\"show-more-less-html__markup[^\"]*\"[^>]*>(.*?)</div>", r.text, re.DOTALL)
            if m:
                clean = re.sub(r"<[^>]+>", " ", m.group(1))
                j.description = " ".join(html.unescape(clean).split())
        except Exception:
            pass

    if jobs:
        with ThreadPoolExecutor(max_workers=min(8, len(jobs))) as pool:
            list(pool.map(fetch_full_desc, jobs[:10]))

    return jobs

def _search_jsearch(query: str, location: str, limit: int) -> List[JobPosting]:
    url = "https://jsearch.p.rapidapi.com/search-v2"
    
    is_remote = location and location.lower() == "remote"
    
    # Force India
    if is_remote:
        search_query = f"{query} in India"
    else:
        search_query = f"{query} in {location}, India" if location and "india" not in location.lower() else (f"{query} in {location}" if location else f"{query} in India")
    
    querystring = {
        "query": search_query,
        "num_pages": "2",
        "country": "in"
    }
    if is_remote:
        querystring["remote_jobs_only"] = "true"

    headers = {
        "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }

    resp = requests.get(url, headers=headers, params=querystring, timeout=8)
    resp.raise_for_status()
    data = resp.json()

    raw_data = data.get("data")
    if isinstance(raw_data, dict):
        # /search-v2 returns {"jobs": [...], "cursor": "..."}
        jobs_data = raw_data.get("jobs", [])
    elif isinstance(raw_data, list):
        jobs_data = raw_data
    else:
        jobs_data = []

    jobs: List[JobPosting] = []
    for item in jobs_data[:limit]:
        if not isinstance(item, dict): continue
        # JSearch provides salary ranges if available, but they are nested differently
        salary_str = None
        if item.get("job_min_salary") and item.get("job_max_salary"):
            salary_str = f"{item.get('job_min_salary')} - {item.get('job_max_salary')} {item.get('job_salary_currency', 'USD')}"

        jobs.append(
            JobPosting(
                id=str(item.get("job_id", "")),
                source="jsearch",
                title=item.get("job_title", ""),
                company=item.get("employer_name", ""),
                location=item.get("job_city") or item.get("job_country") or location,
                description=item.get("job_description", ""),
                url=item.get("job_apply_link", ""),
                salary=salary_str,
                min_salary=float(item.get("job_min_salary")) if item.get("job_min_salary") else None,
                job_type=item.get("job_employment_type"),
                experience_level=item.get("job_required_experience", {}).get("required_experience_in_months") if isinstance(item.get("job_required_experience"), dict) else None,
                is_remote=bool(item.get("job_is_remote", False) or is_remote),
                created=item.get("job_posted_at_datetime_utc", ""),
            )
        )
    return jobs

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

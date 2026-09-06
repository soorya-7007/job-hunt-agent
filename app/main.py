"""FastAPI entrypoint exposing REST endpoints and serving the Stitch web frontend."""
from __future__ import annotations

import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.agents import company_prep_agent, profile_agent, tailoring_agent, tracker_agent, chat_agent, autofill_agent, learning_agent
from app.config import settings
from app.pipeline import run, tailor_for_job
from app.schemas import (
    Application,
    CandidateProfile,
    CoverLetter,
    InterviewPrep,
    JobPosting,
    MatchResult,
    TailoredResume,
)
from app.tools import resume_parser, tracker

app = FastAPI(
    title="AI Job-Hunt Agent API",
    description="REST API for the supervisor-led multi-agent job search platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"


# --------------------------------------------------------------------------- #
# Request / Response Models
# --------------------------------------------------------------------------- #
class SearchRequest(BaseModel):
    resume_text: str = ""
    target_roles: List[str] = Field(default_factory=lambda: ["GenAI Engineer", "Backend Developer"])
    locations: List[str] = Field(default_factory=lambda: ["Remote"])
    work_mode: str = "any"
    limit: int = 100


class SearchResponse(BaseModel):
    profile: CandidateProfile
    matches: List[MatchResult]


class TailorRequest(BaseModel):
    job_id: str
    resume_text: str = ""
    profile: Optional[CandidateProfile] = None
    job: Optional[JobPosting] = None


class TailorResponse(BaseModel):
    tailored_resume: TailoredResume
    cover_letter: CoverLetter


class PrepRequest(BaseModel):
    job_id: str
    resume_text: str = ""
    profile: Optional[CandidateProfile] = None
    job: Optional[JobPosting] = None


class PrepResponse(BaseModel):
    interview_prep: InterviewPrep
    markdown: str


class ApplyRequest(BaseModel):
    job_id: str
    resume_text: str = ""
    profile: Optional[CandidateProfile] = None
    job: Optional[JobPosting] = None
    tailored_resume: Optional[TailoredResume] = None


class ApplyResponse(BaseModel):
    screenshot_base64: Optional[str] = None


class LearnRequest(BaseModel):
    job_id: str
    resume_text: str = ""
    profile: Optional[CandidateProfile] = None
    job: Optional[JobPosting] = None
    gaps: List[str] = Field(default_factory=list)


class LearnResponse(BaseModel):
    markdown: str


class UpdateStatusRequest(BaseModel):
    status: str


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


# --------------------------------------------------------------------------- #
# API Endpoints
# --------------------------------------------------------------------------- #
@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "llm_configured": settings.has_llm(),
        "adzuna_configured": settings.has_adzuna(),
        "langsmith_configured": settings.has_langsmith(),
    }


@app.post("/api/profile/parse", response_model=CandidateProfile)
def parse_profile(
    resume_text: str = Form(...),
    target_roles: str = Form(""),
    locations: str = Form(""),
    work_mode: str = Form("any"),
) -> CandidateProfile:
    prefs = {
        "target_roles": [r.strip() for r in target_roles.split(",") if r.strip()],
        "locations": [loc.strip() for loc in locations.split(",") if loc.strip()],
        "work_mode": work_mode,
    }
    return profile_agent.build_profile(resume_text, prefs)


@app.post("/api/profile/upload")
async def upload_resume(
    file: UploadFile = File(...),
    target_roles: str = Form(""),
    locations: str = Form(""),
    work_mode: str = Form("any"),
) -> Dict[str, Any]:
    cache_dir = Path("data") / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    temp_path = cache_dir / file.filename

    content = await file.read()
    temp_path.write_bytes(content)

    text = resume_parser.extract_text(str(temp_path))
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from uploaded document.")

    prefs = {
        "target_roles": [r.strip() for r in target_roles.split(",") if r.strip()],
        "locations": [loc.strip() for loc in locations.split(",") if loc.strip()],
        "work_mode": work_mode,
    }
    profile = profile_agent.build_profile(text, prefs)
    return {"resume_text": text, "profile": profile}


@app.post("/api/jobs/search", response_model=SearchResponse)
def search_jobs_endpoint(req: SearchRequest) -> SearchResponse:
    if not req.resume_text.strip():
        req.resume_text = "Software Engineer with hands-on skills in Python, FastAPI, Docker, and SQL."

    prefs = {
        "target_roles": req.target_roles,
        "locations": req.locations,
        "work_mode": req.work_mode,
    }
    profile, matches = run(req.resume_text, prefs, limit=req.limit)
    return SearchResponse(profile=profile, matches=matches)


@app.post("/api/jobs/tailor", response_model=TailorResponse)
def tailor_endpoint(req: TailorRequest) -> TailorResponse:
    profile = req.profile or CandidateProfile(summary=req.resume_text)
    job = req.job

    if not job:
        # Fallback to search sample jobs for this ID
        from app.tools.job_boards import search_jobs

        sample_jobs = search_jobs("", limit=50)
        matched = next((j for j in sample_jobs if j.id == req.job_id), None)
        if not matched:
            raise HTTPException(status_code=404, detail="Job not found for tailoring.")
        job = matched

    import json
    cache_dir = Path("data") / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"tailored_{req.job_id}.json"

    if cache_file.exists():
        try:
            return TailorResponse.model_validate_json(cache_file.read_text())
        except Exception:
            pass

    tailored_resume = tailor_for_job(profile, job, req.resume_text)
    cover_letter = tailoring_agent.draft_cover_letter(profile, job, req.resume_text)
    res = TailorResponse(tailored_resume=tailored_resume, cover_letter=cover_letter)
    cache_file.write_text(res.model_dump_json())
    return res


@app.post("/api/jobs/prep", response_model=PrepResponse)
def prep_endpoint(req: PrepRequest) -> PrepResponse:
    profile = req.profile or CandidateProfile(summary=req.resume_text)
    job = req.job

    if not job:
        from app.tools.job_boards import search_jobs

        sample_jobs = search_jobs("", limit=50)
        matched = next((j for j in sample_jobs if j.id == req.job_id), None)
        if not matched:
            raise HTTPException(status_code=404, detail="Job not found for interview prep.")
        job = matched

    prep = company_prep_agent.generate_interview_prep(profile, job, req.resume_text)
    return PrepResponse(interview_prep=prep, markdown=prep.to_markdown())


@app.post("/api/jobs/apply", response_model=ApplyResponse)
def apply_endpoint(req: ApplyRequest) -> ApplyResponse:
    profile = req.profile or CandidateProfile(summary=req.resume_text)
    
    if req.tailored_resume:
        profile.summary = req.tailored_resume.summary
        profile.skills = req.tailored_resume.bullets
        
    job = req.job

    if not job:
        from app.tools.job_boards import search_jobs
        sample_jobs = search_jobs("", limit=50)
        matched = next((j for j in sample_jobs if j.id == req.job_id), None)
        if not matched:
            raise HTTPException(status_code=404, detail="Job not found for autofill.")
        job = matched

    if not job.url:
        raise HTTPException(status_code=400, detail="Job has no application URL.")

    screenshot = autofill_agent.attempt_autofill(profile, job.url)
    return ApplyResponse(screenshot_base64=screenshot)


@app.post("/api/jobs/learn", response_model=LearnResponse)
def learn_endpoint(req: LearnRequest) -> LearnResponse:
    profile = req.profile or CandidateProfile(summary=req.resume_text)
    job = req.job

    if not job:
        from app.tools.job_boards import search_jobs
        sample_jobs = search_jobs("", limit=50)
        matched = next((j for j in sample_jobs if j.id == req.job_id), None)
        if not matched:
            raise HTTPException(status_code=404, detail="Job not found for learning path.")
        job = matched

    markdown = learning_agent.generate_learning_path(profile, job, req.gaps)
    return LearnResponse(markdown=markdown)


@app.get("/api/tracker/dashboard")
def tracker_dashboard() -> Dict[str, Any]:
    summary = tracker_agent.get_pipeline_summary()
    actions = tracker_agent.get_pending_actions()
    return {"summary": summary, "pending_actions": actions}


@app.get("/api/tracker/applications", response_model=List[Application])
def get_applications() -> List[Application]:
    return tracker_agent.get_all_applications()


@app.post("/api/tracker/applications", response_model=Application)
def save_application(app_data: Application) -> Application:
    return tracker.save_application(app_data)


@app.patch("/api/tracker/applications/{app_id}/status", response_model=Application)
def update_stage(app_id: int, req: UpdateStatusRequest) -> Application:
    updated = tracker_agent.update_application_stage(app_id, req.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found.")
    return updated


@app.delete("/api/tracker/applications/{app_id}")
def delete_application_endpoint(app_id: int) -> Dict[str, bool]:
    deleted = tracker.delete_application(app_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found.")
    return {"success": True}


@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest) -> ChatResponse:
    reply = chat_agent.handle_chat_message(req.message)
    return ChatResponse(reply=reply)


# --------------------------------------------------------------------------- #
# Static Frontend Serving
# --------------------------------------------------------------------------- #
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    def index_page():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/jobs")
    def jobs_page():
        return FileResponse(FRONTEND_DIR / "jobs.html")

    @app.get("/dashboard")
    def dashboard_page():
        return FileResponse(FRONTEND_DIR / "dashboard.html")

    @app.get("/profile")
    def profile_page():
        return FileResponse(FRONTEND_DIR / "profile.html")

    @app.get("/chat")
    def chat_page():
        return FileResponse(FRONTEND_DIR / "chat.html")

    @app.get("/apply-dummy")
    def apply_dummy_page():
        return FileResponse(FRONTEND_DIR / "apply-dummy.html")

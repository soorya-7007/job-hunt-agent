"""LangGraph supervisor graph orchestrating the multi-agent job hunt lifecycle.

Workflow:
  1. Profile Agent (parse resume & preferences into structured profile)
  2. Discovery Agent (search job listings via official APIs / sample data)
  3. Matching Agent (semantic embeddings + honest fit scoring & gap notes)
  [Human Gate #1: User reviews matches and selects a job]
  4. Tailoring Agent (reflection loop with no-fabrication critic + cover letter)
  5. Company-Prep Agent (company web research + interview Q&A + talking points)
  [Human Gate #2: User approves tailored artifacts]
  6. Tracker Agent (persist to SQLite tracker)
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from app.agents import (
    company_prep_agent,
    discovery_agent,
    matching_agent,
    profile_agent,
    tailoring_agent,
    tracker_agent,
)
from app.agents.critic import critique
from app.config import settings
from app.schemas import (
    CandidateProfile,
    CoverLetter,
    InterviewPrep,
    JobPosting,
    MatchResult,
    TailoredResume,
)


class JobHuntState(TypedDict, total=False):
    """The unified state passed across all agents in the supervisor graph."""

    resume_text: str
    preferences: Optional[Dict[str, Any]]
    limit: int
    profile: Optional[CandidateProfile]
    jobs: List[JobPosting]
    matches: List[MatchResult]
    selected_job_id: Optional[str]
    selected_job: Optional[JobPosting]
    tailored_resume: Optional[TailoredResume]
    cover_letter: Optional[CoverLetter]
    interview_prep: Optional[InterviewPrep]
    approval_status: Optional[str]  # "approved" | "rejected" | "pending"
    messages: List[str]
    current_step: str
    error: Optional[str]


def _setup_tracing():
    """Ensure LangSmith environment variables are registered if configured."""
    if settings.has_langsmith():
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
        os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
        os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT


# --------------------------------------------------------------------------- #
# Supervisor Graph Nodes
# --------------------------------------------------------------------------- #
def profile_node(state: JobHuntState) -> Dict[str, Any]:
    """Node: Parse candidate resume and preferences into CandidateProfile."""
    _setup_tracing()
    resume_text = state.get("resume_text", "")
    prefs = state.get("preferences") or {}
    profile = profile_agent.build_profile(resume_text, prefs)

    skill_count = len(profile.skills)
    roles = ", ".join(profile.target_roles) or "None specified"
    msg = f"[Supervisor -> ProfileAgent] Built profile: {skill_count} skills identified, target roles: {roles}."

    msgs = list(state.get("messages", []))
    msgs.append(msg)
    return {"profile": profile, "current_step": "profile_built", "messages": msgs}


def discovery_node(state: JobHuntState) -> Dict[str, Any]:
    """Node: Discover relevant job postings."""
    _setup_tracing()
    profile = state.get("profile")
    limit = state.get("limit", 20)

    if not profile:
        return {"jobs": [], "error": "No profile available for discovery."}

    jobs = discovery_agent.discover_jobs(profile, limit=limit)
    msg = f"[Supervisor -> DiscoveryAgent] Discovered {len(jobs)} postings."

    msgs = list(state.get("messages", []))
    msgs.append(msg)
    return {"jobs": jobs, "current_step": "jobs_discovered", "messages": msgs}


def matching_node(state: JobHuntState) -> Dict[str, Any]:
    """Node: Semantic matching, fit scoring, and skill-gap identification."""
    _setup_tracing()
    profile = state.get("profile")
    jobs = state.get("jobs", [])

    if not profile or not jobs:
        return {"matches": [], "current_step": "matching_skipped"}

    matches = matching_agent.match_jobs(profile, jobs)
    top_score = matches[0].score if matches else 0.0
    msg = f"[Supervisor -> MatchingAgent] Ranked {len(matches)} matches. Top fit: {top_score}/100."

    msgs = list(state.get("messages", []))
    msgs.append(msg)
    return {"matches": matches, "current_step": "jobs_matched", "messages": msgs}


def tailoring_node(state: JobHuntState) -> Dict[str, Any]:
    """Node: Tailor resume and draft cover letter with reflection loop."""
    _setup_tracing()
    profile = state.get("profile")
    resume_text = state.get("resume_text", "")
    job = state.get("selected_job")

    # If job not directly in state, look up by selected_job_id
    if not job and state.get("selected_job_id"):
        target_id = state["selected_job_id"]
        for m in state.get("matches", []):
            if m.job.id == target_id:
                job = m.job
                break
        if not job:
            for j in state.get("jobs", []):
                if j.id == target_id:
                    job = j
                    break

    if not profile or not job:
        return {"error": "Missing profile or selected job for tailoring."}

    # Reflection loop: draft -> critic -> revise if unsupported claims
    draft = tailoring_agent.tailor_resume(profile, job, resume_text)
    verdict = critique(draft, resume_text, profile)

    revisions = 0
    while not verdict.passed and revisions < 1:
        feedback = "; ".join(verdict.flagged)
        draft = tailoring_agent.tailor_resume(profile, job, resume_text, feedback=feedback)
        draft.revised = True
        verdict = critique(draft, resume_text, profile)
        revisions += 1

    draft.critique = verdict
    cover_letter = tailoring_agent.draft_cover_letter(profile, job, resume_text)

    status_str = "passed cleanly" if verdict.passed else f"flagged ({len(verdict.flagged)} items)"
    msg = f"[Supervisor -> TailoringAgent] Drafted resume & cover letter for {job.company}. Critic: {status_str}."

    msgs = list(state.get("messages", []))
    msgs.append(msg)
    return {
        "selected_job": job,
        "tailored_resume": draft,
        "cover_letter": cover_letter,
        "current_step": "tailored",
        "messages": msgs,
    }


def company_prep_node(state: JobHuntState) -> Dict[str, Any]:
    """Node: Research company and generate interview prep sheet."""
    _setup_tracing()
    profile = state.get("profile")
    job = state.get("selected_job")
    resume_text = state.get("resume_text", "")

    if not profile or not job:
        return {"error": "Missing profile or job for interview prep."}

    prep = company_prep_agent.generate_interview_prep(profile, job, resume_text)
    msg = (
        f"[Supervisor -> CompanyPrepAgent] Generated prep sheet for {job.company}: "
        f"{len(prep.likely_questions)} questions, {len(prep.key_talking_points)} talking points."
    )

    msgs = list(state.get("messages", []))
    msgs.append(msg)
    return {
        "interview_prep": prep,
        "current_step": "prepped",
        "messages": msgs,
    }


def tracker_node(state: JobHuntState) -> Dict[str, Any]:
    """Node: Persist application state in SQLite database."""
    _setup_tracing()
    job = state.get("selected_job")
    if not job:
        return {"error": "No job to track."}

    # Determine fit score from matches if available
    fit_score = 0.0
    for m in state.get("matches", []):
        if m.job.id == job.id:
            fit_score = m.score
            break

    app_record = tracker_agent.track_job(
        job=job,
        fit_score=fit_score,
        status="tailored",
        tailored_resume=state.get("tailored_resume"),
        notes=f"Tracked via supervisor graph. Prepped: {bool(state.get('interview_prep'))}",
    )

    msg = f"[Supervisor -> TrackerAgent] Persisted application (ID: {app_record.id}, stage: {app_record.status})."
    msgs = list(state.get("messages", []))
    msgs.append(msg)
    return {
        "current_step": "tracked",
        "messages": msgs,
    }


# --------------------------------------------------------------------------- #
# Routing & Conditions
# --------------------------------------------------------------------------- #
def route_after_matching(state: JobHuntState) -> str:
    """Check if a specific job was requested for tailoring."""
    if state.get("selected_job") or state.get("selected_job_id"):
        return "tailoring"
    return END


def route_after_prep(state: JobHuntState) -> str:
    """If human approved or auto-tracking is flagged, persist in tracker."""
    if state.get("approval_status") == "approved":
        return "tracker"
    return END


# --------------------------------------------------------------------------- #
# Supervisor Graph Builder
# --------------------------------------------------------------------------- #
def build_supervisor_graph() -> Any:
    """Construct and compile the LangGraph supervisor state graph."""
    workflow = StateGraph(JobHuntState)

    # Add Nodes
    workflow.add_node("profile", profile_node)
    workflow.add_node("discovery", discovery_node)
    workflow.add_node("matching", matching_node)
    workflow.add_node("tailoring", tailoring_node)
    workflow.add_node("company_prep", company_prep_node)
    workflow.add_node("tracker", tracker_node)

    # Add Edges
    workflow.add_edge(START, "profile")
    workflow.add_edge("profile", "discovery")
    workflow.add_edge("discovery", "matching")

    # Conditional routing after matching: proceed to tailoring if job selected, else pause
    workflow.add_conditional_edges(
        "matching",
        route_after_matching,
        {"tailoring": "tailoring", END: END},
    )

    # After tailoring, always generate company prep
    workflow.add_edge("tailoring", "company_prep")

    # After company prep, route to tracker if approved
    workflow.add_conditional_edges(
        "company_prep",
        route_after_prep,
        {"tracker": "tracker", END: END},
    )
    workflow.add_edge("tracker", END)

    return workflow.compile()


# --------------------------------------------------------------------------- #
# High-Level Supervisor Workflows
# --------------------------------------------------------------------------- #
def run_search_workflow(
    resume_text: str,
    preferences: Optional[Dict[str, Any]] = None,
    limit: int = 20,
) -> JobHuntState:
    """Execute Profile -> Discovery -> Matching pipeline via LangGraph."""
    graph = build_supervisor_graph()
    initial_state: JobHuntState = {
        "resume_text": resume_text,
        "preferences": preferences or {},
        "limit": limit,
        "messages": [],
    }
    result = graph.invoke(initial_state)
    return result


def run_job_prep_workflow(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str = "",
    auto_track: bool = False,
) -> JobHuntState:
    """Execute Tailoring -> Company Prep -> (Optional) Tracker via LangGraph."""
    graph = build_supervisor_graph()
    initial_state: JobHuntState = {
        "profile": profile,
        "selected_job": job,
        "selected_job_id": job.id,
        "resume_text": resume_text or profile.to_text(),
        "approval_status": "approved" if auto_track else "pending",
        "messages": [],
    }
    # Direct execution of tailoring + prep sub-flow
    t_out = tailoring_node(initial_state)
    initial_state.update(t_out)

    p_out = company_prep_node(initial_state)
    initial_state.update(p_out)

    if auto_track:
        tr_out = tracker_node(initial_state)
        initial_state.update(tr_out)

    return initial_state

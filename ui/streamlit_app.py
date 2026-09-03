"""Streamlit demo UI for the Job-Hunt Agent (Phase 3).

Run from the project root:
    streamlit run ui/streamlit_app.py

Phase 3 introduces:
  - Supervisor-led multi-agent orchestration via LangGraph,
  - Company-Prep Agent: targeted interview questions, grounded answers, and talking points,
  - Honest cover letter generator alongside tailored resumes,
  - Tracker dashboard metrics and pending action items,
  - LangSmith tracing integration,
  - Markdown prep guide export.
"""
import sys
from pathlib import Path

# Make the project root importable when launched via `streamlit run`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import streamlit as st  # noqa: E402

from app.agents import tailoring_agent, tracker_agent  # noqa: E402
from app.config import settings  # noqa: E402
from app.orchestrator.graph import run_search_workflow  # noqa: E402
from app.pipeline import prep_for_job, run, tailor_for_job  # noqa: E402
from app.schemas import Application  # noqa: E402
from app.tools.resume_parser import extract_text  # noqa: E402

st.set_page_config(page_title="AI Job-Hunt Agent", page_icon="🎯", layout="wide")
st.title("🎯 AI Job-Hunt Agent — Phase 3")
st.caption("Supervisor-led multi-agent system: discovery, matching, honest tailoring, company prep, and application tracking.")

# --------------------------------------------------------------------------- #
# Session state
# --------------------------------------------------------------------------- #
ss = st.session_state
ss.setdefault("profile", None)
ss.setdefault("matches", [])
ss.setdefault("resume_text", "")
ss.setdefault("drafts", {})          # job_id -> TailoredResume
ss.setdefault("cover_letters", {})   # job_id -> CoverLetter
ss.setdefault("prep_guides", {})     # job_id -> InterviewPrep
ss.setdefault("approved", set())     # job_ids saved to tracker
ss.setdefault("supervisor_logs", []) # log messages from LangGraph supervisor

# --------------------------------------------------------------------------- #
# Sidebar inputs & Status
# --------------------------------------------------------------------------- #
with st.sidebar:
    st.header("Your inputs")
    uploaded = st.file_uploader("Resume (PDF or .txt)", type=["pdf", "txt"])
    pasted = st.text_area("…or paste your resume text", height=160)
    roles = st.text_input("Target roles (comma-separated)", "GenAI Engineer, ML Engineer")
    location = st.text_input("Location", "Remote")
    work_mode = st.selectbox("Work mode", ["any", "remote", "hybrid", "onsite"])
    go = st.button("🚀 Find matches (Supervisor)", type="primary")

    st.divider()
    st.markdown("**Multi-Agent Architecture**")
    st.write("Supervisor: `LangGraph StateGraph`")
    st.write("LLM: " + (f"✅ {settings.LLM_MODEL}" if settings.has_llm() else "⚠️ Heuristic mode"))
    st.write("Jobs: " + ("✅ Adzuna API" if settings.has_adzuna() else "⚠️ Bundled sample data"))
    st.write("LangSmith: " + ("✅ Active tracing" if settings.has_langsmith() else "⚠️ Off (.env)"))
    st.caption("6 coordinated agents: Profile · Discovery · Matching · Tailoring · Company-Prep · Tracker")


def _resume_text() -> str:
    if uploaded is not None:
        cache = Path("data") / "cache"
        cache.mkdir(parents=True, exist_ok=True)
        fp = cache / uploaded.name
        fp.write_bytes(uploaded.getbuffer())
        return extract_text(str(fp))
    return pasted or ""


# --------------------------------------------------------------------------- #
# Rendering helpers
# --------------------------------------------------------------------------- #
def render_match(m):
    """One job card: match info + tailoring controls + interview prep."""
    with st.container(border=True):
        head = st.columns([0.8, 0.2])
        head[0].markdown(f"### {m.job.title}")
        head[1].metric("Fit Score", f"{m.score}/100")

        meta = f"**{m.job.company}** · {m.job.location}"
        if m.job.salary:
            meta += f" · 💰 {m.job.salary}"
        st.write(meta)
        st.write(m.reasons)
        if m.gaps:
            st.write("**Skill gaps:** " + ", ".join(m.gaps))
        if m.job.url:
            st.markdown(f"[View official posting →]({m.job.url})")

        job_id = m.job.id
        b_col1, b_col2, _ = st.columns([0.35, 0.35, 0.3])
        if b_col1.button("✍️ Tailor resume & letter", key=f"tailor_{job_id}"):
            with st.spinner("Tailoring resume & drafting cover letter (with critic reflection)…"):
                ss.drafts[job_id] = tailor_for_job(ss.profile, m.job, ss.resume_text)
                ss.cover_letters[job_id] = tailoring_agent.draft_cover_letter(ss.profile, m.job, ss.resume_text)

        if b_col2.button("🎯 Interview Prep", key=f"prep_{job_id}"):
            with st.spinner("Researching company and synthesizing interview Q&A guide…"):
                ss.prep_guides[job_id] = prep_for_job(ss.profile, m.job, ss.resume_text)

        # Render Tailored Draft if available
        if job_id in ss.drafts:
            render_draft(m, ss.drafts[job_id], ss.cover_letters.get(job_id))

        # Render Interview Prep Guide if available
        if job_id in ss.prep_guides:
            render_interview_prep(ss.prep_guides[job_id])


def render_draft(m, draft, cover_letter=None):
    """Original-vs-tailored view + critic verdict + cover letter + human approval gate."""
    st.divider()
    st.markdown("#### ✍️ Tailored Documents" + (" · revised after critic feedback" if draft.revised else ""))

    t_tab1, t_tab2 = st.tabs(["📄 Resume Bullet Points", "✉️ Cover Letter"])

    with t_tab1:
        c1, c2 = st.columns(2)
        with c1:
            st.caption("Your original summary")
            st.write((ss.profile.summary if ss.profile else "") or "—")
        with c2:
            st.caption("Tailored summary")
            st.write(draft.summary or "—")

        st.caption("Tailored achievement bullets")
        for b in draft.bullets:
            st.markdown(f"- {b}")
        if draft.keywords_covered:
            st.write("**Job keywords covered:** " + ", ".join(draft.keywords_covered))

        verdict = draft.critique
        if verdict and verdict.passed:
            st.success("✅ No-fabrication critic: every claim is grounded in your resume.")
        elif verdict:
            st.warning("⚠️ Critic flagged possible unsupported claims — review before using:")
            for f in verdict.flagged:
                st.markdown(f"- {f}")

    with t_tab2:
        if cover_letter:
            st.caption(f"Targeted cover letter for {cover_letter.company}")
            st.text_area("Cover letter content", cover_letter.content, height=220)
        else:
            st.info("Click 'Tailor resume & letter' to generate.")

    a1, a2, _ = st.columns([0.3, 0.3, 0.4])
    if a1.button("✅ Approve & track", key=f"approve_{m.job.id}"):
        _save_to_tracker(m, draft)
    if a2.button("🗑️ Discard", key=f"discard_{m.job.id}"):
        ss.drafts.pop(m.job.id, None)
        ss.cover_letters.pop(m.job.id, None)
        st.rerun()

    if m.job.id in ss.approved:
        st.info("Tracked ✓ — view in the 📋 Tracker tab.")


def render_interview_prep(prep):
    """Render structured interview preparation guide."""
    st.divider()
    st.markdown(f"#### 🎯 Interview Preparation Sheet: {prep.company}")
    st.info(f"**Company Overview:** {prep.company_overview}")

    with st.expander("💡 Key Talking Points & Pitch", expanded=True):
        for tp in prep.key_talking_points:
            st.markdown(f"• {tp}")

    with st.expander("💬 Anticipated Interview Q&A (Grounded in Your Background)", expanded=True):
        for i, q in enumerate(prep.likely_questions, 1):
            badge = f"`{q.category.upper()}`"
            st.markdown(f"**{i}. {badge} {q.question}**")
            if q.suggested_answer:
                st.markdown(f"> **Strategy / Response:** {q.suggested_answer}")
            if q.talking_points:
                st.caption("Emphasize: " + " · ".join(q.talking_points))
            st.write("")

    with st.expander("❓ Questions to Ask the Hiring Team", expanded=False):
        for qa in prep.questions_to_ask_interviewer:
            st.markdown(f"- {qa}")

    st.download_button(
        label="📥 Download Prep Guide (.md)",
        data=prep.to_markdown(),
        file_name=f"prep_{prep.company.lower().replace(' ', '_')}.md",
        mime="text/markdown",
        key=f"dl_prep_{prep.job_id}",
    )


def _save_to_tracker(m, draft):
    try:
        from app.tools import tracker

        tracker.save_application(
            Application(
                job_id=m.job.id,
                job_title=m.job.title,
                company=m.job.company,
                location=m.job.location,
                url=m.job.url,
                fit_score=m.score,
                status="tailored",
                tailored_summary=draft.summary,
                tailored_bullets=draft.bullets,
                notes="Tailored via Job-Hunt Supervisor.",
            )
        )
        ss.approved.add(m.job.id)
        st.success("Saved to your application tracker.")
    except Exception as exc:
        st.error(f"Could not save to tracker: {exc}")


def render_tracker():
    st.subheader("📋 Application Tracker & Dashboard")

    summary = tracker_agent.get_pipeline_summary()
    m_cols = st.columns(6)
    m_cols[0].metric("Total", summary["total"])
    m_cols[1].metric("Saved", summary["by_status"].get("saved", 0))
    m_cols[2].metric("Tailored", summary["by_status"].get("tailored", 0))
    m_cols[3].metric("Applied", summary["by_status"].get("applied", 0))
    m_cols[4].metric("Interview", summary["by_status"].get("interview", 0))
    m_cols[5].metric("Offers", summary["by_status"].get("offer", 0))

    # Pending actions
    actions = tracker_agent.get_pending_actions()
    if actions:
        with st.expander(f"⚠️ Action Required ({len(actions)} pending items)", expanded=False):
            for act in actions:
                st.write(f"• **{act['job_title']}** at {act['company']} — `{act['action']}` (Priority: {act['priority']})")

    apps = tracker_agent.get_all_applications()
    if not apps:
        st.info("No tracked applications yet. Find matches, tailor documents, and click **Approve & track**.")
        return

    from app.tools import tracker

    for a in apps:
        with st.container(border=True):
            cols = st.columns([0.45, 0.3, 0.25])
            cols[0].markdown(f"**{a.job_title}** — {a.company}")
            if a.url:
                cols[0].markdown(f"[View Posting →]({a.url})")
            cols[0].caption(f"Updated {a.updated_at or '—'}")

            new_status = cols[1].selectbox(
                "Pipeline Stage",
                tracker.STATUSES,
                index=tracker.STATUSES.index(a.status) if a.status in tracker.STATUSES else 0,
                key=f"status_{a.id}",
            )
            if cols[1].button("Update Stage", key=f"upd_{a.id}"):
                tracker_agent.update_application_stage(a.id, new_status)
                st.rerun()

            cols[2].metric("Fit Score", f"{a.fit_score}/100")
            if cols[2].button("Delete", key=f"del_{a.id}"):
                tracker.delete_application(a.id)
                st.rerun()

            with st.expander("Tailored Summary & Experience Bullets"):
                st.write(a.tailored_summary or "—")
                for b in a.tailored_bullets:
                    st.markdown(f"- {b}")


def render_supervisor_view():
    st.subheader("🤖 LangGraph Multi-Agent Supervisor")
    st.markdown(
        """
        The system uses a **Supervisor-Led StateGraph** coordinating 6 specialist agents:
        1. **Profile Agent**: parses resume text and user target preferences into structured Pydantic models.
        2. **Discovery Agent**: retrieves live postings via job board APIs or fallback datasets.
        3. **Matching Agent**: computes cosine similarity with `all-MiniLM-L6-v2` embeddings and gap analysis.
        4. **Tailoring Agent**: drafts job-specific resumes & cover letters with a self-correcting critic reflection loop.
        5. **Company-Prep Agent**: integrates DuckDuckGo web search to synthesize tailored interview Q&A.
        6. **Tracker Agent**: persists lifecycle states to SQLite with stage progression and metric aggregation.
        """
    )

    if ss.supervisor_logs:
        st.markdown("#### Live Supervisor Execution Log")
        for log in ss.supervisor_logs:
            st.code(log, language="bash")
    else:
        st.info("Run a search to see the supervisor execution trace logs.")


# --------------------------------------------------------------------------- #
# Run pipeline on trigger
# --------------------------------------------------------------------------- #
if go:
    text = _resume_text()
    if not text.strip():
        st.warning("Please upload or paste your resume first.")
        st.stop()

    prefs = {
        "target_roles": [r.strip() for r in roles.split(",") if r.strip()],
        "locations": [location.strip()] if location.strip() else [],
        "work_mode": work_mode,
    }

    with st.spinner("LangGraph supervisor coordinating agents: Profile ➔ Discovery ➔ Matching…"):
        state = run_search_workflow(text, prefs, limit=20)
        profile = state.get("profile")
        matches = state.get("matches", [])
        logs = state.get("messages", [])

    ss.profile = profile
    ss.matches = matches
    ss.resume_text = text
    ss.drafts = {}
    ss.cover_letters = {}
    ss.prep_guides = {}
    ss.approved = set()
    ss.supervisor_logs = logs

# --------------------------------------------------------------------------- #
# Main Layout Tabs
# --------------------------------------------------------------------------- #
tab_match, tab_track, tab_agent = st.tabs(["🔎 Job Matches", "📋 Tracker & Dashboard", "🤖 Multi-Agent Supervisor"])

with tab_match:
    if not ss.matches:
        st.info("Fill in the sidebar and click **Find matches**. Runs out of the box with zero API keys required.")
    else:
        st.subheader("Parsed Candidate Profile")
        st.write(f"**Skills:** {', '.join(ss.profile.skills) or '—'}")
        st.write(f"**Target roles:** {', '.join(ss.profile.target_roles) or '—'}")
        st.write(f"**Work mode:** {ss.profile.work_mode or 'any'}")

        st.subheader(f"Ranked Matches ({len(ss.matches)})")
        for m in ss.matches:
            render_match(m)

with tab_track:
    render_tracker()

with tab_agent:
    render_supervisor_view()

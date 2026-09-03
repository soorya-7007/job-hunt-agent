"""Streamlit demo UI for the Job-Hunt Agent (Phase 2).

Run from the project root:
    streamlit run ui/streamlit_app.py

Phase 2 adds, on top of the Phase 1 ranked matches:
  - a "Tailor my resume for this job" button on each match,
  - a side-by-side original-vs-tailored view with the no-fabrication critic's verdict,
  - a human-approval gate (Approve & track / Discard) — the agent never finalises alone,
  - a Tracker tab backed by SQLite, where you move applications through their stages.
"""
import sys
from pathlib import Path

# Make the project root importable when launched via `streamlit run`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import streamlit as st  # noqa: E402

from app.config import settings  # noqa: E402
from app.pipeline import run, tailor_for_job  # noqa: E402
from app.schemas import Application  # noqa: E402
from app.tools.resume_parser import extract_text  # noqa: E402

st.set_page_config(page_title="AI Job-Hunt Agent", page_icon="🎯", layout="wide")
st.title("🎯 AI Job-Hunt Agent — Phase 2")
st.caption("Upload your resume, get ranked matches, then tailor + track applications — honestly.")

# --------------------------------------------------------------------------- #
# Session state: Streamlit reruns top-to-bottom on every click, so anything we
# want to survive a click (matches, drafts, approvals) must live here.
# --------------------------------------------------------------------------- #
ss = st.session_state
ss.setdefault("profile", None)
ss.setdefault("matches", [])
ss.setdefault("resume_text", "")
ss.setdefault("drafts", {})       # job_id -> TailoredResume
ss.setdefault("approved", set())  # job_ids already saved to the tracker

# --------------------------------------------------------------------------- #
# Sidebar inputs
# --------------------------------------------------------------------------- #
with st.sidebar:
    st.header("Your inputs")
    uploaded = st.file_uploader("Resume (PDF or .txt)", type=["pdf", "txt"])
    pasted = st.text_area("…or paste your resume text", height=180)
    roles = st.text_input("Target roles (comma-separated)", "GenAI Engineer, ML Engineer")
    location = st.text_input("Location", "Remote")
    work_mode = st.selectbox("Work mode", ["any", "remote", "hybrid", "onsite"])
    go = st.button("Find matches", type="primary")

    st.divider()
    st.markdown("**Config status**")
    st.write("LLM: " + (f"✅ {settings.LLM_MODEL}" if settings.has_llm() else "⚠️ not set (heuristic mode)"))
    st.write("Jobs: " + ("✅ Adzuna" if settings.has_adzuna() else "⚠️ bundled sample jobs"))
    if not settings.has_llm():
        st.caption("Add an LLM key in .env for real tailoring + critic reasoning.")


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
    """One job card: the Phase 1 match info + the Phase 2 tailoring controls."""
    with st.container(border=True):
        head = st.columns([0.8, 0.2])
        head[0].markdown(f"### {m.job.title}")
        head[1].metric("Fit", f"{m.score}")

        meta = f"**{m.job.company}** · {m.job.location}"
        if m.job.salary:
            meta += f" · 💰 {m.job.salary}"
        st.write(meta)
        st.write(m.reasons)
        if m.gaps:
            st.write("**Skill gaps:** " + ", ".join(m.gaps))
        if m.job.url:
            st.markdown(f"[View posting →]({m.job.url})")

        job_id = m.job.id
        if st.button("✍️ Tailor my resume for this job", key=f"tailor_{job_id}"):
            with st.spinner("Tailoring, then running the no-fabrication critic…"):
                ss.drafts[job_id] = tailor_for_job(ss.profile, m.job, ss.resume_text)

        if job_id in ss.drafts:
            render_draft(m, ss.drafts[job_id])


def render_draft(m, draft):
    """Original-vs-tailored view + critic verdict + the human-approval gate."""
    st.markdown("#### ✍️ Tailored draft" + (" · revised after critic feedback" if draft.revised else ""))

    c1, c2 = st.columns(2)
    with c1:
        st.caption("Your original summary")
        st.write((ss.profile.summary if ss.profile else "") or "—")
    with c2:
        st.caption("Tailored summary")
        st.write(draft.summary or "—")

    st.caption("Tailored bullets")
    for b in draft.bullets:
        st.markdown(f"- {b}")
    if draft.keywords_covered:
        st.write("**JD keywords covered:** " + ", ".join(draft.keywords_covered))

    verdict = draft.critique
    if verdict and verdict.passed:
        st.success("✅ No-fabrication critic: every claim is grounded in your resume.")
    elif verdict:
        st.warning("⚠️ Critic flagged possible unsupported claims — review before using:")
        for f in verdict.flagged:
            st.markdown(f"- {f}")

    a1, a2, _ = st.columns([0.3, 0.3, 0.4])
    if a1.button("✅ Approve & track", key=f"approve_{m.job.id}"):
        _save_to_tracker(m, draft)
    if a2.button("🗑️ Discard", key=f"discard_{m.job.id}"):
        ss.drafts.pop(m.job.id, None)
        st.rerun()

    if m.job.id in ss.approved:
        st.info("Tracked ✓ — see the 📋 Tracker tab.")


def _save_to_tracker(m, draft):
    try:
        from app.tools import tracker  # lazy import (needs SQLAlchemy)

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
            )
        )
        ss.approved.add(m.job.id)
        st.success("Saved to your tracker (status: tailored).")
    except Exception as exc:
        st.error(f"Could not save to tracker: {exc}")


def render_tracker():
    st.subheader("📋 Application tracker")
    try:
        from app.tools import tracker  # lazy import (needs SQLAlchemy)

        apps = tracker.list_applications()
    except Exception as exc:
        st.error(f"Tracker unavailable ({exc}). Is SQLAlchemy installed?")
        return

    if not apps:
        st.info("No tracked applications yet. Tailor a job and click **Approve & track**.")
        return

    for a in apps:
        with st.container(border=True):
            cols = st.columns([0.45, 0.3, 0.25])
            cols[0].markdown(f"**{a.job_title}** — {a.company}")
            if a.url:
                cols[0].markdown(f"[posting →]({a.url})")
            cols[0].caption(f"Updated {a.updated_at or '—'}")

            new_status = cols[1].selectbox(
                "Status",
                tracker.STATUSES,
                index=tracker.STATUSES.index(a.status) if a.status in tracker.STATUSES else 0,
                key=f"status_{a.id}",
            )
            if cols[1].button("Update", key=f"upd_{a.id}"):
                tracker.update_status(a.id, new_status)
                st.rerun()

            cols[2].metric("Fit", a.fit_score)
            if cols[2].button("Delete", key=f"del_{a.id}"):
                tracker.delete_application(a.id)
                st.rerun()

            with st.expander("Tailored summary & bullets"):
                st.write(a.tailored_summary or "—")
                for b in a.tailored_bullets:
                    st.markdown(f"- {b}")


# --------------------------------------------------------------------------- #
# Run the pipeline when the button is pressed, then persist results in state.
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
    with st.spinner("Parsing profile, discovering jobs, and ranking…"):
        profile, matches = run(text, prefs)

    ss.profile = profile
    ss.matches = matches
    ss.resume_text = text
    ss.drafts = {}        # a fresh search starts with no drafts
    ss.approved = set()

# --------------------------------------------------------------------------- #
# Layout: Matches tab (find + tailor + approve) and Tracker tab.
# --------------------------------------------------------------------------- #
tab_match, tab_track = st.tabs(["🔎 Matches", "📋 Tracker"])

with tab_match:
    if not ss.matches:
        st.info("Fill in the sidebar and click **Find matches**. No API keys? It runs on bundled sample jobs.")
    else:
        st.subheader("Your parsed profile")
        st.write(f"**Skills:** {', '.join(ss.profile.skills) or '—'}")
        st.write(f"**Target roles:** {', '.join(ss.profile.target_roles) or '—'}")

        st.subheader(f"Top matches ({len(ss.matches)})")
        for m in ss.matches:
            render_match(m)

with tab_track:
    render_tracker()

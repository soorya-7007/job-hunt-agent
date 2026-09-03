"""Streamlit demo UI for the Job-Hunt Agent (Phase 1).

Run from the project root:
    streamlit run ui/streamlit_app.py
"""
import sys
from pathlib import Path

# Make the project root importable when launched via `streamlit run`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import streamlit as st  # noqa: E402

from app.config import settings  # noqa: E402
from app.pipeline import run  # noqa: E402
from app.tools.resume_parser import extract_text  # noqa: E402

st.set_page_config(page_title="AI Job-Hunt Agent", page_icon="🎯", layout="wide")
st.title("🎯 AI Job-Hunt Agent — Phase 1")
st.caption("Upload your resume, set preferences, and get ranked job matches.")

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
    st.write("LLM: " + (f"✅ {settings.LLM_MODEL}" if settings.has_llm() else "⚠️ not set (heuristic parsing)"))
    st.write("Jobs: " + ("✅ Adzuna" if settings.has_adzuna() else "⚠️ bundled sample jobs"))


def _resume_text() -> str:
    if uploaded is not None:
        cache = Path("data") / "cache"
        cache.mkdir(parents=True, exist_ok=True)
        fp = cache / uploaded.name
        fp.write_bytes(uploaded.getbuffer())
        return extract_text(str(fp))
    return pasted or ""


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

    st.subheader("Your parsed profile")
    st.write(f"**Skills:** {', '.join(profile.skills) or '—'}")
    st.write(f"**Target roles:** {', '.join(profile.target_roles) or '—'}")

    st.subheader(f"Top matches ({len(matches)})")
    for m in matches:
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
else:
    st.info("Fill in the sidebar and click **Find matches**. No API keys? It runs on bundled sample jobs.")

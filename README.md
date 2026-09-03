# 🎯 AI Job-Hunt Agent

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/UI-Streamlit-FF4B4B?logo=streamlit&logoColor=white)
![LiteLLM](https://img.shields.io/badge/LLM-LiteLLM-412991)
![RAG](https://img.shields.io/badge/RAG-sentence--transformers-FFD21E)
![License](https://img.shields.io/badge/License-MIT-3DA639)
![Status](https://img.shields.io/badge/status-Phase%202%20complete-brightgreen)

An **agentic AI** system that reads your resume, discovers real job postings, and
ranks them by fit — with honest, LLM-written reasoning and skill-gap analysis.
Built to showcase in-demand **GenAI / LLM Engineer** skills for campus placements.

> **Status:** Phase 2 (working demo). It reads your resume, ranks real jobs, then
> tailors your resume per job with a no-fabrication critic and tracks applications
> in SQLite. Phases 3–4 add a LangGraph supervisor, company prep, evaluation, and
> deployment. See `docs/BLUEPRINT.md`.

<!-- 📸 Add a screenshot once you run the app:
     1) streamlit run ui/streamlit_app.py
     2) screenshot the ranked matches, save it as docs/demo.png
     3) uncomment the next line -->
<!-- ![Job-Hunt Agent demo](docs/demo.png) -->

---

## Why this project stands out

- **Multi-agent design** (Profile → Discovery → Matching → Tailoring), the pattern real GenAI teams use.
- **RAG-style semantic matching** with local embeddings — no paid API required to run.
- **Responsible AI by design:** official job-board APIs only (no scraping), human-in-the-loop
  approval, and a **no-fabrication critic** that rejects any invented skill or claim in tailored resumes.
- **A self-correcting writer:** the Tailoring agent drafts, a critic re-reads it, and it revises — the
  "reflection loop" at the heart of agentic AI.
- **Runs with zero API keys** out of the box, and gets smarter when you add them.

---

## Tech stack

| Area | Tools |
|------|-------|
| Language | Python 3.10+ |
| LLM access | LiteLLM — provider-agnostic (OpenAI GPT-4o-mini · Google Gemini · local Ollama) |
| Embeddings / RAG | sentence-transformers (`all-MiniLM-L6-v2`) + NumPy cosine similarity |
| Data validation | Pydantic v2 |
| Job data | Adzuna API (official) with a bundled sample fallback |
| Resume parsing | pdfplumber |
| Tracker DB | SQLite via SQLAlchemy (ORM data modeling) |
| UI | Streamlit |
| Testing | pytest |
| Coming next | LangGraph · LangSmith · Docker (Phases 3–4) |

---

## Quickstart

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) add API keys
cp .env.example .env             # then edit .env

# 4. Run the demo UI
streamlit run ui/streamlit_app.py
```

No keys? It still works: heuristic resume parsing + bundled `data/sample_jobs.json`.

Add an **LLM key** (OpenAI / Gemini / local Ollama) for structured parsing and
written match reasoning. Add free **Adzuna** keys for live job listings.

---

## How it works (Phase 1)

```
resume (PDF/text)
      │
      ▼
┌───────────────┐   ┌────────────────┐   ┌───────────────┐
│ Profile Agent │──▶│ Discovery Agent│──▶│ Matching Agent│──▶ ranked matches
│ resume→profile│   │ query→postings │   │ score+reasons │
└───────────────┘   └────────────────┘   └───────────────┘
```

- **Profile Agent** (`app/agents/profile_agent.py`) — resume text → structured `CandidateProfile`.
- **Discovery Agent** (`app/agents/discovery_agent.py`) — builds a query, fetches postings (Adzuna or sample).
- **Matching Agent** (`app/agents/matching_agent.py`) — embeds profile + jobs, scores by cosine similarity, adds reasoning and skill gaps.
- **Orchestrator** (`app/pipeline.py`) — sequential glue; becomes a LangGraph supervisor in Phase 3.

---

## How it works (Phase 2 — tailor + track)

Once you have matches, pick a job and the agent tailors your resume for it — honestly.

```
chosen job ──▶ Tailoring Agent ──▶ Critic ──▶ passed? ──▶ you Approve ──▶ SQLite tracker
                (summary+bullets)   (no-fab)      │ no                       (saved→…→offer)
                       ▲                          │
                       └──── revise once ◀────────┘   (reflection loop)
```

- **Tailoring Agent** (`app/agents/tailoring_agent.py`) — rewrites your summary + 3–5 bullets to mirror the job, using **only** what's in your resume.
- **Critic** (`app/agents/critic.py`) — re-reads the draft and flags any skill/claim not in your resume. A deterministic keyword guard works with no API key; an LLM critic adds a broader second opinion.
- **Reflection loop** (`app/pipeline.py:tailor_for_job`) — if the critic flags something, the writer gets one shot to fix it automatically.
- **Human-approval gate** (Streamlit) — you see original vs. tailored + the verdict, then **Approve** or **Discard**. Nothing is saved without you.
- **Tracker** (`app/tools/tracker.py`) — approved jobs go into SQLite (via SQLAlchemy) and move through `saved → tailored → applied → interview → offer → rejected`.

---

## Project layout

```
job-hunt-agent/
├── app/
│   ├── config.py          # env-driven settings + capability flags
│   ├── schemas.py         # Pydantic models (Profile, Job, Match, TailoredResume, Application)
│   ├── llm.py             # provider-agnostic chat via LiteLLM (+ JSON helper)
│   ├── agents/            # profile, discovery, matching, tailoring, critic
│   ├── tools/             # resume_parser, job_boards, embeddings, tracker (SQLite)
│   └── pipeline.py        # orchestrator: run() + tailor_for_job() reflection loop
├── ui/streamlit_app.py    # demo interface (Matches + Tracker tabs)
├── data/sample_jobs.json  # runs with no API keys
├── tests/                 # light, key-free tests
└── docs/BLUEPRINT.md      # full architecture + 4-phase roadmap
```

---

## Testing

```bash
pytest -q          # light tests (no models/keys needed)
```

---

## Roadmap (summary)

| Phase | Adds |
|-------|------|
| **1 ✅** | Profile + Discovery + Matching + Streamlit demo |
| **2 ✅** | Tailoring agent, no-fabrication critic, human approval, SQLite tracker |
| **3** | Company-Prep agent, LangGraph supervisor, LangSmith tracing |
| **4** | Evaluation harness, guardrail tests, Docker, deploy, demo video |

Full detail in [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

---

## Responsible use

This tool assists a human job seeker. It uses only official job-board APIs (never
scrapes sites that forbid it), never auto-submits applications, and never fabricates
skills or experience. Your resume data stays local; API keys live in `.env`.

---

## License

Released under the [MIT License](LICENSE) © 2026 sooryansh.

---

## Author

Built by **sooryansh** ([@soorya-7007](https://github.com/soorya-7007)) as a portfolio
project for GenAI / LLM Engineer roles. Feedback and stars are welcome ⭐

# 🎯 AI Job-Hunt Agent

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/UI-Streamlit-FF4B4B?logo=streamlit&logoColor=white)
![LiteLLM](https://img.shields.io/badge/LLM-LiteLLM-412991)
![RAG](https://img.shields.io/badge/RAG-sentence--transformers-FFD21E)
![License](https://img.shields.io/badge/License-MIT-3DA639)
![Status](https://img.shields.io/badge/status-Phase%201%20complete-brightgreen)

An **agentic AI** system that reads your resume, discovers real job postings, and
ranks them by fit — with honest, LLM-written reasoning and skill-gap analysis.
Built to showcase in-demand **GenAI / LLM Engineer** skills for campus placements.

> **Status:** Phase 1 (working demo). Phases 2–4 add resume tailoring, a LangGraph
> supervisor, company prep, evaluation, and deployment. See `docs/BLUEPRINT.md`.

<!-- 📸 Add a screenshot once you run the app:
     1) streamlit run ui/streamlit_app.py
     2) screenshot the ranked matches, save it as docs/demo.png
     3) uncomment the next line -->
<!-- ![Job-Hunt Agent demo](docs/demo.png) -->

---

## Why this project stands out

- **Multi-agent design** (Profile → Discovery → Matching), the pattern real GenAI teams use.
- **RAG-style semantic matching** with local embeddings — no paid API required to run.
- **Responsible AI by design:** official job-board APIs only (no scraping), human-in-the-loop,
  and a no-fabrication rule for the resume-tailoring agent (Phase 2).
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
| UI | Streamlit |
| Testing | pytest |
| Coming next | LangGraph · LangSmith · SQLite · Docker (Phases 2–4) |

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

## Project layout

```
job-hunt-agent/
├── app/
│   ├── config.py          # env-driven settings + capability flags
│   ├── schemas.py         # Pydantic models (Profile, JobPosting, MatchResult)
│   ├── llm.py             # provider-agnostic chat via LiteLLM (+ JSON helper)
│   ├── agents/            # profile, discovery, matching
│   ├── tools/             # resume_parser, job_boards, embeddings
│   └── pipeline.py        # Phase 1 orchestrator
├── ui/streamlit_app.py    # demo interface
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
| **2** | Tailoring agent, no-fabrication critic, human approval, SQLite tracker |
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

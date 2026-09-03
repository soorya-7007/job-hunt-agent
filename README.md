# 🎯 AI Job-Hunt Agent

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/UI-Streamlit-FF4B4B?logo=streamlit&logoColor=white)
![LiteLLM](https://img.shields.io/badge/LLM-LiteLLM-412991)
![RAG](https://img.shields.io/badge/RAG-sentence--transformers-FFD21E)
![License](https://img.shields.io/badge/License-MIT-3DA639)
![Status](https://img.shields.io/badge/status-Phase%204%20complete-brightgreen)

An **agentic AI** system that reads your resume, discovers real job postings, and
ranks them by fit — with honest, LLM-written reasoning and skill-gap analysis.
Built to showcase in-demand **GenAI / LLM Engineer** skills for campus placements.

> **Status:** Phase 4 complete. Orchestrates 6 specialist agents via a LangGraph state graph with LangSmith observability, interview prep synthesis, and human-in-the-loop approval gates. Includes a full Evaluation Harness, Guardrail tests against hallucinations, and Dockerized deployment. See `docs/BLUEPRINT.md`.

<!-- 📸 Add a screenshot once you run the app:
     1) streamlit run ui/streamlit_app.py
     2) screenshot the ranked matches, save it as docs/demo.png
     3) uncomment the next line -->
<!-- ![Job-Hunt Agent demo](docs/demo.png) -->

---

## Why this project stands out

- **Supervisor-led multi-agent system:** 6 specialized agents coordinated via a **LangGraph StateGraph** with conditional routing and approval gates.
- **RAG-style semantic matching** with local embeddings — no paid API required to run.
- **Responsible AI by design:** official job-board APIs only (no scraping), human-in-the-loop
  approval, and a **no-fabrication critic** that rejects any invented skill or claim in tailored resumes and cover letters.
- **A self-correcting writer:** the Tailoring agent drafts, a critic re-reads it, and it revises — the
  "reflection loop" at the heart of agentic AI.
- **Company-Prep Agent:** web search integration + grounded interview Q&A guides and talking points.
- **Full observability:** native LangSmith tracing for token tracking, latency, and agent step visibility.
- **Runs with zero API keys** out of the box, and gets smarter when you add them.

---

## Tech stack

| Area | Tools |
|------|-------|
| Language | Python 3.10+ |
| Agent Supervisor | LangGraph (StateGraph with conditional routing & human gates) |
| LLM access | LiteLLM — provider-agnostic (OpenAI GPT-4o-mini · Google Gemini · local Ollama) |
| Embeddings / RAG | sentence-transformers (`all-MiniLM-L6-v2`) + NumPy cosine similarity |
| Observability | LangSmith (native tracing) |
| Data validation | Pydantic v2 |
| Job data | Adzuna API (official) with a bundled sample fallback |
| Web search | DuckDuckGo / ddgs (zero-key company research) |
| Resume parsing | pdfplumber |
| Tracker DB | SQLite via SQLAlchemy (ORM data modeling) |
| Backend API | FastAPI (REST endpoints with CORS & static file serving) |
| UI | Stitch Web Frontend (`frontend/`) + Streamlit (`ui/streamlit_app.py`) |
| Testing | pytest (21 unit & integration tests) |
| Deployment | Docker containerized (`Dockerfile`) |
| Evaluation | Evaluation harness (`app/evaluation/`) & guardrail tests |

---

## Quickstart

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) add API keys & LangSmith tracing
cp .env.example .env             # then edit .env

# 4. Option A: Run the Stitch Modern Web App (Recommended)
uvicorn app.main:app --port 8000
# -> Open http://localhost:8000 for the full Stitch experience!
# -> /jobs (3-zone Discovery), /dashboard (Kanban), /profile (AI Resume Intake)

# 4. Option B: Run the Streamlit Demo UI
streamlit run ui/streamlit_app.py
```

No keys? It still works: heuristic resume parsing + bundled `data/sample_jobs.json`.

Add an **LLM key** (OpenAI / Gemini / local Ollama) for structured parsing and
written match reasoning. Add free **Adzuna** keys for live job listings.

---

## How it works (Phase 3 — Supervisor Multi-Agent System)

```
                            ┌───────────────────────────────────────────────┐
                            │           LangGraph Supervisor Graph          │
                            └───────────────────────┬───────────────────────┘
                                                    │
             ┌───────────────────┬──────────────────┼───────────────────┬───────────────────┐
             ▼                   ▼                  ▼                   ▼                   ▼
     ┌───────────────┐   ┌────────────────┐ ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
     │ Profile Agent │──▶│ Discovery Agent│▶│ Matching Agent│──▶│Tailoring Agent│──▶│  Company-Prep │
     │ resume→profile│   │ query→postings │ │ score+reasons │   │resume+letter  │   │interview Q&A  │
     └───────────────┘   └────────────────┘ └───────────────┘   └───────┬───────┘   └───────┬───────┘
                                                                        │ (critic loop)     │
                                                                        ▼                   ▼
                                                          [ Human Approval Gate ] ──▶ [ Tracker Agent ]
                                                          (Approve & Track / Discard)  (SQLite DB)
```

- **LangGraph Supervisor** (`app/orchestrator/graph.py`) — manages the state machine, coordinating all agents and routing work based on user approval.
- **Profile Agent** (`app/agents/profile_agent.py`) — resume text → structured `CandidateProfile`.
- **Discovery Agent** (`app/agents/discovery_agent.py`) — builds queries, fetches postings (Adzuna or sample).
- **Matching Agent** (`app/agents/matching_agent.py`) — embeds profile + jobs, scores by cosine similarity, adds reasoning and skill gaps.
- **Tailoring Agent & Critic** (`app/agents/tailoring_agent.py`, `app/agents/critic.py`) — rewrites summary, bullets, and cover letters, with an automatic reflection loop enforcing zero hallucinated qualifications.
- **Company-Prep Agent** (`app/agents/company_prep_agent.py`) — searches company background and generates grounded interview Q&A and key talking points (exportable to Markdown).
- **Tracker Agent** (`app/agents/tracker_agent.py`) — SQLite-backed lifecycle state tracking (`saved → tailored → applied → interview → offer → rejected`) with pending action items.

---

## Project layout

```
job-hunt-agent/
├── app/
│   ├── config.py             # env-driven settings + LangSmith flags
│   ├── schemas.py            # Pydantic models (Profile, Job, Match, Prep, CoverLetter)
│   ├── llm.py                # provider-agnostic chat via LiteLLM (+ JSON helper)
│   ├── orchestrator/
│   │   └── graph.py          # LangGraph supervisor state graph + routing
│   ├── agents/
│   │   ├── profile_agent.py
│   │   ├── discovery_agent.py
│   │   ├── matching_agent.py
│   │   ├── tailoring_agent.py
│   │   ├── critic.py
│   │   ├── company_prep_agent.py
│   │   └── tracker_agent.py
│   ├── tools/
│   │   ├── resume_parser.py  # pdfplumber
│   │   ├── job_boards.py     # Adzuna API + sample fallback
│   │   ├── embeddings.py     # sentence-transformers
│   │   ├── search.py         # DuckDuckGo / ddgs company research
│   │   └── tracker.py        # SQLite persistence via SQLAlchemy
│   └── pipeline.py           # unified entrypoint
├── ui/streamlit_app.py       # demo interface (Matches, Tracker, and Supervisor tabs)
├── data/sample_jobs.json     # runs with no API keys
├── tests/                    # pytest suite (Phases 1, 2, and 3)
│   ├── test_matching.py
│   ├── test_phase2.py
│   └── test_phase3.py
└── docs/BLUEPRINT.md         # full architecture + 4-phase roadmap
```

---

## Testing

```bash
pytest -v          # key-free unit and integration test suite, including adversarial guardrails
```

---

## Evaluation & Guardrails

An evaluation harness ensures the system is robust and safe:
- **Match Evaluation (`app/evaluation/match_eval.py`)**: Tests the `MatchingAgent`'s precision in ranking jobs against a mock labeled dataset.
- **Tailoring Evaluation (`app/evaluation/tailoring_eval.py`)**: LLM-as-judge setup to verify the `TailoringAgent` correctly mirrors language without hallucinating.
- **Guardrail Tests (`tests/test_guardrails.py`)**: Adversarial tests to ensure the system strictly refuses to invent experience when encountering skill gaps (e.g., job demands React, profile lacks it).

---

## Docker Deployment

To run the full-stack FastAPI app in a container:

```bash
docker build -t job-hunt-agent .
docker run -p 8000:8000 job-hunt-agent
```
Then navigate to `http://localhost:8000`.

---

## Stretch Goals Completed

This project includes the following advanced optional features:

### 1. Conversational Chat Assistant
A natural language interface available at `/chat` where you can ask things like *"Find me remote React jobs"*. The backend LLM automatically invokes the `search_jobs` tool using ReAct-style routing and replies in a friendly format.

### 2. Auto-fill Application Forms (Beta)
Provides an automated browser automation script (using Playwright) to automatically navigate to job application links and fill in your Candidate Profile details (First Name, Last Name, Email, etc.). Accessible via the "Auto-Fill Form" button in the Job Discover page.

### 3. Skills-Gap to Learning-Path
When you identify missing skills required for a job, you can click "Learning Path" to instantly generate a personalized Markdown curriculum to bridge your knowledge gaps.

### 4. Model Context Protocol (MCP) Server
An MCP server allowing you to expose the Agent's Job Board searching tools to other AI assistants like Claude Desktop or Cursor.
To run the MCP server via `stdio`:
```bash
python -m app.mcp_server
```
You can configure your MCP client to spawn this process, granting it the `search_for_jobs` tool powered by this project.

---

## Roadmap (summary)

| Phase | Adds |
|-------|------|
| **1 ✅** | Profile + Discovery + Matching + Streamlit demo |
| **2 ✅** | Tailoring agent, no-fabrication critic, human approval, SQLite tracker |
| **3 ✅** | Company-Prep agent, LangGraph supervisor, LangSmith tracing, cover letters |
| **4 ✅** | Evaluation harness, guardrail tests, Docker, deploy, demo video |

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

# AI Job-Hunt Agent — Project Blueprint

An autonomous, multi-agent system that helps a candidate land a job end-to-end: it understands your profile, discovers relevant openings, ranks them by fit, tailors your resume and cover letter for each role, prepares you for interviews, and tracks every application — with you approving the important steps.

**Why it stands out for placements:** it's a *real agent* (it plans, uses tools, remembers, and self-corrects), it solves a problem every recruiter understands, and the meta-story — *"I built an AI agent to run my own job hunt"* — is memorable in an interview. It also happens to exercise almost the entire in-demand 2026 GenAI stack.

**Level:** intermediate. Buildable in phases (a working MVP in ~1 week; full system in ~3–4 weeks).

---

## 1. What it does — the one-line flow

> Upload resume + preferences → agent finds & ranks jobs → you pick which to pursue → agent tailors resume + cover letter and preps interview questions → everything is tracked in a dashboard → (optional) it re-scans for new roles daily.

---

## 2. System Architecture

The system is a **supervisor-led multi-agent crew**. A central Orchestrator plans the work and routes tasks to specialized agents. Each agent uses **tools** to act in the world, and all state lives in a **memory layer** (a database + a vector store). Everything is traced for observability.

```
┌───────────────────────────────────────────────────────────────────────┐
│                         USER  (Streamlit web UI)                        │
│      upload resume · set preferences · review ranked jobs · approve     │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │  requests / approvals
                    ┌─────────────▼──────────────┐
                    │   ORCHESTRATOR / SUPERVISOR │   ← LangGraph state graph
                    │   plans steps, routes work, │     (planning + routing +
                    │   enforces human-in-the-loop│      human approval gates)
                    └──┬────┬────┬────┬────┬───────┘
         ┌─────────────┘    │    │    │    └──────────────┐
         ▼                  ▼    ▼    ▼                   ▼
 ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 │ PROFILE      │ │ DISCOVERY    │ │ MATCHING /   │ │ TAILORING /  │
 │ AGENT        │ │ (RESEARCHER) │ │ SCORING      │ │ WRITER AGENT │
 │ parse resume │ │ search job   │ │ rank fit +   │ │ tailor resume│
 │ + prefs      │ │ boards       │ │ gap analysis │ │ + cover letter│
 └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
         ┌──────────────┐ ┌──────────────┐
         │ COMPANY-PREP │ │ TRACKER      │
         │ AGENT        │ │ AGENT        │
         │ interview Q&A│ │ log status + │
         │ + talking pts│ │ deadlines    │
         └──────────────┘ └──────────────┘
                                  │  every agent calls tools ▼
 ┌───────────────────────────── TOOLS ───────────────────────────────────┐
 │ Job-board APIs · Web search · PDF/resume parser · Document generator    │
 │ Embedding/similarity · Database read/write                              │
 └─────────────────────────────────────────────────────────────────────────┘
                                  │  reads / writes ▼
 ┌──────────────────────────── MEMORY / DATA ─────────────────────────────┐
 │ Relational DB (SQLite→Postgres): profile, jobs, applications, status    │
 │ Vector store (Chroma/FAISS): job + profile embeddings for matching      │
 └─────────────────────────────────────────────────────────────────────────┘

 Cross-cutting:  Observability → LangSmith/Langfuse   |   Guardrails → Pydantic + policy checks
```

**The five layers, in plain terms:**

1. **UI layer** — where you upload your resume, set preferences, review results, and approve actions.
2. **Orchestrator** — the "brain" that decides the order of work, routes each task to the right agent, and pauses for your approval before anything important.
3. **Agent layer** — six specialists, each responsible for one job (below).
4. **Tool layer** — the concrete actions agents can take (search jobs, parse a PDF, write a document, query the DB).
5. **Memory/data layer** — long-term state: your profile, all discovered jobs, and every application's status, plus a vector store for smart matching.

---

## 3. The Agents (multi-agent design)

| Agent | Responsibility | Key tools it uses | Output |
|---|---|---|---|
| **Profile Agent** | Turn your resume + stated preferences into a clean, structured candidate profile (skills, years, roles, locations, salary, work-mode). | PDF/text parser, LLM structuring | A validated `CandidateProfile` object |
| **Discovery Agent** | Build search queries from the profile and pull live postings from job-board APIs; normalize them into one schema. | Job-board APIs, web search | A list of normalized `JobPosting`s |
| **Matching Agent** | Score each posting against the profile (semantic similarity + LLM reasoning), explain *why* it fits, and list skill gaps. | Embeddings + vector store, LLM | Ranked jobs with fit score + gap notes |
| **Tailoring Agent** | For jobs you choose, rewrite resume bullets to mirror the JD's language and draft a tailored cover letter — **without inventing experience** (a critic pass enforces this). | LLM, document generator | Tailored resume + cover letter files |
| **Company-Prep Agent** | Research the company and generate likely interview questions, strong answers based on *your* background, and talking points. | Web search, LLM | Interview prep sheet |
| **Tracker Agent** | Persist everything — which jobs, which stage (saved / applied / interview / offer / rejected), deadlines and reminders; answer "what's pending?" | Database read/write | Application dashboard state |
| **Orchestrator (Supervisor)** | Plan the overall flow, route to the right agent, manage the reflection loops and the human-approval gates. | (controls the others) | Coordinated run |

---

## 4. The agentic workflow (the act → observe → reflect loop)

1. **Intake.** You upload your resume and set preferences. The Profile Agent structures it and saves it to memory.
2. **Discovery.** The Orchestrator triggers the Discovery Agent, which derives search queries and calls the job-board APIs, collecting a batch of postings.
3. **Matching.** The Matching Agent embeds each posting and your profile, computes similarity, then reasons over the top candidates to produce a fit score (0–100), a short "why it fits," and a skills-gap list. Results are shown to you, ranked.
4. **Human-in-the-loop #1.** You pick which jobs to actually pursue. (The agent never applies on its own.)
5. **Tailoring + reflection.** For each chosen job, the Tailoring Agent drafts a tailored resume and cover letter, then a **critic step re-reads its own draft** to check: does it claim any skill/experience not in the original resume? If yes, it revises. This self-correction loop is the agentic heart of the writer.
6. **Human-in-the-loop #2.** You review and edit the drafts; nothing is finalized without your approval.
7. **Prep.** The Company-Prep Agent produces an interview question-and-answer sheet grounded in your real background.
8. **Tracking.** The Tracker Agent logs the application, its stage, and deadlines, and can report status on request.
9. **(Optional) Autonomous re-scan.** A scheduled run re-invokes Discovery daily and notifies you of new high-fit roles — a nice demonstration of an agent operating on its own cadence.

---

## 5. Tech Stack

| Layer | Recommended | Easier alternative | Why |
|---|---|---|---|
| Language | **Python 3.11+** | — | Default for all GenAI tooling |
| Agent framework | **LangGraph** (graph-based control, human-in-the-loop built in) | **CrewAI** (simpler "crew of agents") | LangGraph is the more in-demand, more controllable choice; CrewAI is faster to start |
| LLM access | **LiteLLM** (provider-agnostic wrapper) | Direct OpenAI SDK | Lets you swap models without rewriting code |
| Models | **GPT-4o-mini / Gemini 1.5 Flash** (cheap, fast) | **Ollama + Llama 3.1** (free, local) | Cheap hosted models for quality; local for zero-cost dev |
| Embeddings + matching | **sentence-transformers** or OpenAI embeddings + **Chroma** | **FAISS** | Semantic job↔profile matching |
| Job data | **Adzuna API**, **Remotive API**, **RemoteOK**, **USAJobs**, **The Muse** (free/legal) | SerpAPI "Google Jobs" | Real postings without violating any ToS (see §7) |
| Resume parsing | **pdfplumber** / **PyMuPDF** for text → LLM for structure | python-docx (for .docx resumes) | Robust text extraction |
| Document generation | **python-docx** (resume) + **WeasyPrint** or Markdown→PDF (cover letter) | Plain Markdown | Produces shareable, formatted files |
| Database (memory) | **SQLite** (dev) → **PostgreSQL** (prod), via **SQLAlchemy** | SQLite only | Stores profile, jobs, applications |
| Backend API | **FastAPI** | — | Clean REST API; async-friendly |
| Frontend / UI | **Streamlit** (fast, great demo) | React (if you want polish) | Streamlit lets you demo live in days |
| Validation / guardrails | **Pydantic** | — | Enforce structured, safe outputs |
| Observability | **LangSmith** or **Langfuse** | print/logging | Trace every agent step, token, latency — impressive to show |
| Scheduling (optional) | **APScheduler** or cron | — | Daily autonomous re-scan |
| Packaging / deploy | **Docker** → Render / Railway / Hugging Face Spaces | — | Production-style deployment |
| Config / secrets | **python-dotenv** (`.env`) | — | Keep API keys out of code |
| Testing / VCS | **pytest**, **Git/GitHub** | — | Professional hygiene |

---

## 6. Skills you'll use and demonstrate

**Agentic AI (the headline):** multi-agent orchestration (LangGraph/CrewAI), a supervisor/router pattern, tool/function calling, planning & task decomposition, reflection / self-correction loops, agent memory (short- and long-term), and human-in-the-loop control.

**RAG & retrieval:** embeddings, semantic similarity search, and a vector database (Chroma/FAISS) for job–profile matching.

**Core LLM engineering:** prompt & persona design per agent, structured outputs with Pydantic, and multi-provider LLM integration via LiteLLM.

**Backend / LLMOps:** FastAPI service design, observability/tracing (LangSmith/Langfuse), cost & token management, Docker, and cloud deployment.

**Data & software engineering:** Python, SQL + SQLAlchemy data modeling, PDF/document processing, REST APIs, Git, and testing with pytest.

**Evaluation & Responsible AI:** building an eval harness for match quality and tailoring quality, plus guardrails against fabricating qualifications.

**Resume keyword line (ATS-friendly):**
> Python · Agentic AI · Multi-Agent Systems · LangGraph · CrewAI · LLMs · RAG · Vector Databases (Chroma/FAISS) · Function Calling · Prompt Engineering · Pydantic · FastAPI · SQLAlchemy · LangSmith · Docker · Git

---

## 7. Data sources (real, free, and legal)

Use official job-board APIs — **do not scrape LinkedIn or Indeed**, which violates their terms and will look bad if it comes up in an interview.

- **Adzuna API** — free developer tier, global listings, good search parameters.
- **Remotive API** — free, remote-jobs focused, no key required.
- **RemoteOK API** — free public JSON feed of remote roles.
- **USAJobs API** — free, US government roles (great, well-documented sandbox).
- **The Muse API** — free tier with company + role data.
- **SerpAPI (Google Jobs engine)** — aggregates many boards; has a limited free tier (paid beyond it).

> Verify each provider's current free-tier limits and terms when you sign up — API terms change. Start with **Adzuna + Remotive** for the MVP; they're the easiest.

**Ethics built in:** the agent *assists* — it never auto-submits applications, and the Tailoring Agent is explicitly constrained to never claim skills or experience you don't have. Call this out in your write-up; "Responsible AI by design" is a strong signal.

---

## 8. Project / repository structure

```
job-hunt-agent/
├── app/
│   ├── main.py                # FastAPI entrypoint
│   ├── ui/
│   │   └── streamlit_app.py    # the demo UI
│   ├── orchestrator/
│   │   └── graph.py            # LangGraph state graph + routing + approval gates
│   ├── agents/
│   │   ├── profile_agent.py
│   │   ├── discovery_agent.py
│   │   ├── matching_agent.py
│   │   ├── tailoring_agent.py
│   │   ├── company_prep_agent.py
│   │   └── tracker_agent.py
│   ├── tools/
│   │   ├── job_boards.py        # Adzuna / Remotive / RemoteOK clients
│   │   ├── resume_parser.py     # pdfplumber + LLM structuring
│   │   ├── doc_generator.py     # python-docx / WeasyPrint
│   │   ├── search.py            # web search tool
│   │   └── vectorstore.py       # Chroma embeddings + similarity
│   ├── memory/
│   │   ├── models.py            # SQLAlchemy models (profile, job, application)
│   │   └── db.py                # session + init
│   ├── schemas.py               # Pydantic models (CandidateProfile, JobPosting, ...)
│   ├── prompts/                 # one prompt file per agent
│   ├── evaluation/
│   │   ├── match_eval.py        # ranking precision on a labeled set
│   │   └── tailoring_eval.py    # LLM-as-judge rubric
│   └── config.py                # settings, model selection
├── data/
│   └── sample_resume.pdf
├── tests/                       # pytest
├── .env.example                 # API keys template
├── requirements.txt
├── Dockerfile
└── README.md                    # architecture diagram + setup + demo GIF
```

---

## 9. Data model (the memory layer)

Three core tables keep the agent stateful across runs:

- **`profiles`** — id, name, structured skills (JSON), experience, target roles, locations, work-mode, salary range.
- **`jobs`** — id, source, title, company, location, description, url, embedding-id, fetched-at.
- **`applications`** — id, profile-id, job-id, fit-score, status (`saved → tailored → applied → interview → offer → rejected`), tailored-resume-path, cover-letter-path, deadline, notes, updated-at.

This table design is also what powers the dashboard ("what's pending, what's due this week").

---

## 10. Evaluation plan (how you *prove* it works)

Evaluation is what separates a demo from an engineered system — build a small harness:

- **Match quality.** Hand-label ~30–50 (profile, job) pairs as good/bad fit, then measure the agent's ranking with **precision@k** and whether its top picks match your labels.
- **Tailoring quality.** Use an **LLM-as-judge** with a fixed rubric — JD-keyword coverage, relevance, and a hard **"no fabricated experience"** check — plus a few manual spot-checks.
- **Agent reliability.** From LangSmith traces, track tool-call success rate, end-to-end task-completion rate, average latency, and cost per run.
- **Guardrail tests.** Feed adversarial inputs (e.g., a job demanding a skill you lack) and confirm the writer flags the gap instead of inventing the skill.

Put a small results table in your README — it's exactly the rigor interviewers probe for.

---

## 11. Guardrails & Responsible AI

- **No fabrication:** the Tailoring Agent may only rephrase real experience; a critic pass rejects any invented claim.
- **No auto-apply:** the agent stops at human-approval gates before finalizing documents; it never submits on your behalf.
- **Respect ToS:** only official APIs, no scraping of protected sites.
- **Privacy:** the resume stays local/in your own DB; keys live in `.env`, never in code.
- **Transparency:** every recommendation shows its reasoning and the source posting.

---

## 12. Phased build roadmap (so it never feels overwhelming)

**Phase 1 — MVP (≈ week 1).** Profile Agent (parse resume) + Discovery Agent (one API, e.g., Adzuna) + Matching Agent (embeddings + score) + a simple Streamlit list. Two agents, one tool, no DB yet (in-memory). *Deliverable: "paste resume, get ranked jobs."*

**Phase 2 — Tailoring + memory (≈ week 2).** Add the Tailoring Agent (resume + cover letter) with the no-fabrication critic, the human-approval gate, and the SQLite tracker. *Deliverable: "pick a job, get tailored documents, tracked."*

**Phase 3 — Full agentic system (≈ week 3).** Add the Company-Prep Agent, wire everything through a LangGraph supervisor, and add LangSmith observability. *Deliverable: the complete multi-agent flow with tracing.*

**Phase 4 — Polish & prove (≈ week 4).** Evaluation harness, guardrail tests, Docker + deploy, and a README with the architecture diagram and a short demo video/GIF. *Deliverable: a portfolio-ready, deployed project.*

You can stop after any phase and still have something impressive; each phase is a resume-worthy milestone.

---

## 13. Resume bullets & interview talking points

**Resume bullets (adapt the numbers once you have them):**
- *Built an autonomous multi-agent job-search assistant (LangGraph, Python) that discovers, ranks, and tailors applications for job postings, using six coordinated agents with tool-calling, semantic matching (Chroma), and human-in-the-loop approvals.*
- *Designed a self-correcting "tailoring" agent with a critic loop and Pydantic guardrails that prevents fabricated qualifications, and an evaluation harness measuring match precision and tailoring quality (LLM-as-judge).*
- *Deployed the system as a FastAPI + Streamlit app (Docker) with LangSmith tracing for token, latency, and reliability metrics.*

**When they ask "walk me through it":** start with the problem, then the supervisor→agents→tools→memory architecture, then your favorite hard part — the self-correction loop that stops the writer from inventing experience, and how you *measured* that it works. That combination (agents + evaluation + guardrails) is what signals a real GenAI engineer.

---

## 14. Optional stretch goals (extra "wow")

- Expose the job-board tools over **MCP** so the agent could plug into other MCP clients — a rare, ahead-of-the-curve skill.
- Add a **voice/chat** interface ("find me remote Python roles under 3 years experience").
- **Auto-fill** application forms (with approval) via browser automation.
- A **skills-gap → learning-path** hand-off: for recurring gaps, suggest what to learn next.

"""Company-Prep Agent: research the company and generate an interview prep sheet.

Generates:
  1. Company & role overview (incorporating web search).
  2. Targeted interview questions (technical, behavioral, system design).
  3. Suggested answers and talking points STRICTLY grounded in the candidate's real profile.
  4. Thoughtful questions to ask the interviewer.

Like other agents in the system, it works completely key-free with honest heuristic
synthesis and upgrades to LLM reasoning when API keys are supplied.
"""
from __future__ import annotations

from typing import List

from app import llm
from app.agents.profile_agent import SKILL_HINTS
from app.config import settings
from app.schemas import CandidateProfile, InterviewPrep, InterviewQuestion, JobPosting
from app.tools.search import search_company

PREP_SYSTEM = (
    "You are an expert technical interview coach and hiring manager. Create a comprehensive, "
    "honest interview preparation guide for a candidate targeting a specific job.\n"
    "ABSOLUTE RULES:\n"
    "1. Ground all suggested answers and talking points strictly in the candidate's actual resume. "
    "Never invent employers, metrics, degrees, or unmentioned skills.\n"
    "2. For skill gaps, coach the candidate to acknowledge the gap honestly while bridging from related strengths.\n"
    "3. Structure questions across categories: technical, behavioral (STAR method), and role/architecture.\n"
    "4. Return ONLY valid JSON."
)


def generate_interview_prep(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str = "",
) -> InterviewPrep:
    """Generate role- and company-specific interview preparation."""
    company_info = search_company(job.company)

    if settings.has_llm():
        try:
            return _prep_with_llm(profile, job, resume_text, company_info)
        except Exception as exc:
            print(f"[company_prep_agent] LLM prep failed ({exc}); falling back to heuristic.")

    return _prep_heuristic(profile, job, resume_text, company_info)


def _prep_with_llm(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str,
    company_info: str,
) -> InterviewPrep:
    source_resume = (resume_text or profile.to_text())[:5000]
    user = (
        f"CANDIDATE RESUME / PROFILE:\n{source_resume}\n\n"
        f"TARGET JOB: {job.title} at {job.company}\n"
        f"LOCATION: {job.location}\n"
        f"JOB DESCRIPTION:\n{job.description[:2500]}\n\n"
        f"COMPANY SEARCH CONTEXT:\n{company_info[:1500]}\n\n"
        "Return a JSON object with keys:\n"
        "- company_overview (string, 2-3 sentences summarizing the company, domain, and role context)\n"
        "- key_talking_points (list of 3-4 concise strengths from candidate's background relevant to this job)\n"
        "- likely_questions (list of 4-6 objects, each with 'question', 'category' [technical|behavioral|system_design], "
        "'suggested_answer' [grounded in candidate's experience], and 'talking_points' [list of strings])\n"
        "- questions_to_ask_interviewer (list of 3 thoughtful reverse-interview questions about tech, team, or vision)"
    )

    data = llm.chat_json(PREP_SYSTEM, user)

    questions: List[InterviewQuestion] = []
    for q in data.get("likely_questions", []):
        if isinstance(q, dict) and q.get("question"):
            questions.append(
                InterviewQuestion(
                    question=str(q.get("question", "")).strip(),
                    category=str(q.get("category", "technical")).strip().lower(),
                    suggested_answer=str(q.get("suggested_answer", "")).strip(),
                    talking_points=[str(tp).strip() for tp in q.get("talking_points", []) if str(tp).strip()],
                )
            )

    return InterviewPrep(
        job_id=job.id,
        company=job.company,
        role=job.title,
        company_overview=(data.get("company_overview") or f"{job.company} — {job.title}").strip(),
        likely_questions=questions or _build_default_questions(profile, job),
        key_talking_points=[
            str(tp).strip() for tp in data.get("key_talking_points", []) if str(tp).strip()
        ] or _build_default_talking_points(profile, job),
        questions_to_ask_interviewer=[
            str(qa).strip() for qa in data.get("questions_to_ask_interviewer", []) if str(qa).strip()
        ] or _build_default_questions_to_ask(job),
    )


def _prep_heuristic(
    profile: CandidateProfile,
    job: JobPosting,
    resume_text: str,
    company_info: str,
) -> InterviewPrep:
    """Heuristic generation that remains honest and grounded with zero API keys."""
    overview = (
        f"{job.company} is hiring for a {job.title}. "
        + (company_info.splitlines()[0] if company_info else f"Opportunity based in {job.location or 'remote'}.")
    )

    return InterviewPrep(
        job_id=job.id,
        company=job.company,
        role=job.title,
        company_overview=overview,
        likely_questions=_build_default_questions(profile, job),
        key_talking_points=_build_default_talking_points(profile, job),
        questions_to_ask_interviewer=_build_default_questions_to_ask(job),
    )


def _build_default_questions(profile: CandidateProfile, job: JobPosting) -> List[InterviewQuestion]:
    have = {s.lower() for s in profile.skills}
    job_text = job.to_text().lower()
    overlap = [s for s in SKILL_HINTS if s in have and s in job_text]
    top_skill = overlap[0] if overlap else (profile.skills[0] if profile.skills else "software engineering")

    questions = [
        InterviewQuestion(
            question=f"Tell me about your hands-on experience working with {top_skill.title()} and how you have applied it.",
            category="technical",
            suggested_answer=f"Discuss specific systems or features you built utilizing {top_skill.title()}, highlighting architectural decisions, performance considerations, and results.",
            talking_points=[
                f"Demonstrate proficiency in {top_skill.title()}",
                "Mention real project contexts from your resume",
                "Explain lessons learned and best practices applied",
            ],
        ),
        InterviewQuestion(
            question=f"Why are you interested in joining {job.company} as a {job.title}?",
            category="behavioral",
            suggested_answer=f"Connect your background in {', '.join(overlap[:2]) if overlap else top_skill} to the challenges and goals described in the {job.title} role.",
            talking_points=[
                f"Align your career trajectory with {job.company}'s mission",
                f"Highlight enthusiasm for {job.title} responsibilities",
            ],
        ),
        InterviewQuestion(
            question="Describe a challenging bug or technical bottleneck you encountered and how you diagnosed and resolved it.",
            category="behavioral",
            suggested_answer="Use the STAR method (Situation, Task, Action, Result) based on a project from your resume. Outline your systematic debugging methodology and measurable outcome.",
            talking_points=[
                "Situation: Context of the service/feature",
                "Action: Profiling, logging, isolation steps taken",
                "Result: Measurable speedup, stability improvement, or user impact",
            ],
        ),
        InterviewQuestion(
            question=f"How would you design or structure a production-grade service for {job.title} tasks?",
            category="system_design",
            suggested_answer=f"Break down requirements into data ingestion, API contracts, persistence, and observability (metrics, logging, error handling).",
            talking_points=[
                "Modular architecture and separation of concerns",
                "Defensive error handling and schema validation",
                "Scalability and testing strategies",
            ],
        ),
    ]
    return questions


def _build_default_talking_points(profile: CandidateProfile, job: JobPosting) -> List[str]:
    have = {s.lower() for s in profile.skills}
    job_text = job.to_text().lower()
    overlap = [s.title() for s in SKILL_HINTS if s in have and s in job_text]

    points = []
    if overlap:
        points.append(f"Direct technical match in core competencies: {', '.join(overlap[:4])}.")
    if profile.years_experience:
        points.append(f"Proven track record with approximately {profile.years_experience} years in software engineering.")
    if profile.summary:
        points.append(f"Strong foundation: {profile.summary[:150].strip()}...")
    points.append(f"Eager to contribute directly to {job.company}'s engineering objectives as a {job.title}.")
    return points


def _build_default_questions_to_ask(job: JobPosting) -> List[str]:
    return [
        f"What are the biggest technical challenges the {job.title} team is aiming to solve over the next two quarters?",
        "How is engineering success measured in this role, and what does the feedback loop look like?",
        "What does the deployment, CI/CD, and testing workflow look like day-to-day for the team?",
    ]

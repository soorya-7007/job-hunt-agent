"""Learning Agent: Generates a personalized learning path for skill gaps.

Takes a candidate's profile, a target job, and identified skill gaps, and returns
a Markdown document with recommended courses, projects, and learning strategies.
"""
from app import llm
from app.schemas import CandidateProfile, JobPosting
from app.config import settings

SYSTEM_PROMPT = """You are an expert tech career coach and technical mentor.
The user wants to apply for a specific job, but they are missing a few required skills.
Your task is to generate a personalized, fast-track "Learning Path" to help them bridge this gap.

Structure your response as a beautifully formatted Markdown document:
- Use emojis and clear headings.
- Include a "Quick Wins" section (what they can learn in a weekend).
- Include a "Deep Dive" section (what takes 1-2 weeks).
- Recommend 1-2 specific portfolio project ideas that would prove they know these missing skills.
- Suggest a free resource (like a YouTube search term or documentation link) and a premium one (like Udemy or Coursera).

Be encouraging but realistic. Output ONLY the Markdown document."""

def generate_learning_path(profile: CandidateProfile, job: JobPosting, gaps: list[str]) -> str:
    """Uses LLM to create a markdown learning path based on the candidate's gaps."""
    if not settings.has_llm():
        return "I am currently in 'No-LLM' mode! Add an API key in the `.env` file to generate a learning path."

    if not gaps:
        return "Great news! You don't have any major skill gaps for this role based on our analysis. You're ready to apply!"

    prompt = (
        f"Candidate Background: {profile.summary}\n\n"
        f"Target Job: {job.title} at {job.company}\n"
        f"Job Description snippet: {job.description[:1000]}\n\n"
        f"Missing Skills Identified: {', '.join(gaps)}\n\n"
        "Generate the personalized Learning Path."
    )

    try:
        return llm.chat(SYSTEM_PROMPT, prompt, temperature=0.7)
    except Exception as exc:
        print(f"[learning_agent] Failed to generate learning path: {exc}")
        return "Sorry, I ran into an error generating the learning path. Please try again later."

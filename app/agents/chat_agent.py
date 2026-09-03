"""Chat Agent: A conversational interface for natural language job searching.

This agent uses a simple two-step reasoning process (router -> tool -> reply)
instead of complex native tool calling, making it extremely resilient across all
LLM providers supported by LiteLLM (even smaller local ones).
"""
from typing import List
from app import llm
from app.tools.job_boards import search_jobs
from app.config import settings

ROUTER_SYSTEM = (
    "You are a helpful career assistant. Analyze the user's message.\n"
    "If they are asking you to find jobs, extract the search query and location.\n"
    "Return JSON ONLY with keys:\n"
    "- 'action': either 'search' or 'reply'\n"
    "- 'query': the job title/skills (only if action is search)\n"
    "- 'location': the location, e.g. 'Remote', 'New York' (only if action is search)\n"
    "- 'message': your conversational reply (only if action is reply)"
)

REPLY_SYSTEM = (
    "You are a helpful career assistant. The user asked for jobs, and the system "
    "retrieved the following results. Write a friendly, conversational reply summarizing "
    "the top findings. Keep it concise, mention 2-3 specific roles, and encourage them "
    "to check the Job Search tab for full details."
)

def handle_chat_message(user_message: str) -> str:
    """Process a user chat message, potentially searching for jobs, and return a reply."""
    
    if not settings.has_llm():
        return "I am currently in 'No-LLM' mode! Add an API key in the `.env` file to chat with me. You can still use the Job Search tab."

    try:
        # Step 1: Decide what to do
        decision = llm.chat_json(ROUTER_SYSTEM, user_message)
        
        if decision.get("action") == "reply":
            return decision.get("message", "How can I help you today?")
            
        # Step 2: Search for jobs
        query = decision.get("query", "software engineer")
        location = decision.get("location", "")
        jobs = search_jobs(query, location, limit=5)
        
        if not jobs:
            return f"I couldn't find any jobs matching '{query}' in '{location}'. Try broadening your search!"
            
        # Step 3: Summarize results
        job_summaries = []
        for i, j in enumerate(jobs):
            loc = j.location or "Unknown location"
            job_summaries.append(f"{i+1}. {j.title} at {j.company} ({loc})")
            
        context = (
            f"User asked: {user_message}\n\n"
            f"Search results for '{query}' in '{location}':\n"
            + "\n".join(job_summaries)
        )
        
        return llm.chat(REPLY_SYSTEM, context)
        
    except Exception as exc:
        print(f"[chat_agent] Chat failed: {exc}")
        return "Sorry, I ran into an error processing your request. Please try again later."

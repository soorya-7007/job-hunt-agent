"""Central configuration. Reads from environment variables (.env supported)."""
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # LLM (litellm model string; see .env.example for options)
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

    # Local embedding model (sentence-transformers) — no API key needed
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    # Adzuna job board (free at https://developer.adzuna.com)
    ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
    ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
    ADZUNA_COUNTRY = os.getenv("ADZUNA_COUNTRY", "in")

    # Phase 3: LangSmith Observability & Tracing
    LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() in ("true", "1", "yes")
    LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY", "")
    LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT", "job-hunt-agent")
    LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")

    # Phase 3: Web search provider keys (optional)
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

    # RapidAPI / JSearch
    RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")

    def has_llm(self) -> bool:
        """True if some LLM provider is configured (else we use a heuristic fallback)."""
        return bool(
            os.getenv("OPENAI_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("ANTHROPIC_API_KEY")
            or self.LLM_MODEL.startswith("ollama/")
        )

    def has_jsearch(self) -> bool:
        """True if RapidAPI key exists for JSearch."""
        return bool(self.RAPIDAPI_KEY)

    def has_adzuna(self) -> bool:
        """True if Adzuna keys exist (else we use bundled sample jobs)."""
        return bool(self.ADZUNA_APP_ID and self.ADZUNA_APP_KEY)

    def has_langsmith(self) -> bool:
        """True if LangSmith tracing is active."""
        return bool(self.LANGCHAIN_TRACING_V2 and self.LANGCHAIN_API_KEY)


settings = Settings()

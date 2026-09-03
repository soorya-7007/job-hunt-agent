"""Web search tool for company research and live market context.

Uses duckduckgo_search by default (free, no API key required) and gracefully
degrades to a fallback summary if offline or rate-limited.
"""
from __future__ import annotations

from typing import Dict, List


def search_company(company_name: str, max_results: int = 3) -> str:
    """Search for company background, culture, mission, and tech stack info."""
    clean_name = (company_name or "").strip()
    if not clean_name or clean_name.lower() in ("sample co", "confidential", "stealth"):
        return f"{clean_name or 'The company'} is an innovative team hiring for key technical roles."

    query = f"{clean_name} company about products mission technology"
    results = search_web(query, max_results=max_results)
    if not results:
        return f"{clean_name} operates in the tech and software industry."

    snippets = []
    for r in results:
        title = r.get("title", "")
        body = r.get("body", "")
        if body:
            snippets.append(f"• {title}: {body}")
    return "\n".join(snippets) if snippets else f"{clean_name} operates in the software industry."


def search_web(query: str, max_results: int = 3) -> List[Dict[str, str]]:
    """Execute a web search, returning structured results. Never raises exceptions."""
    try:
        import warnings
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=RuntimeWarning)
            try:
                from ddgs import DDGS
            except ImportError:
                from duckduckgo_search import DDGS

            results: List[Dict[str, str]] = []
            with DDGS() as ddgs:
                for item in ddgs.text(query, max_results=max_results):
                    results.append(
                        {
                            "title": str(item.get("title", "")),
                            "body": str(item.get("body", "")),
                            "href": str(item.get("href", "")),
                        }
                    )
            return results
    except Exception as exc:
        print(f"[search] Search query failed or offline ({exc}); returning empty results.")
        return []

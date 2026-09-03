"""Thin, provider-agnostic LLM client built on litellm.

litellm lets you talk to OpenAI, Google Gemini, Anthropic, or a local Ollama
model through one interface — you only change the model string + env var.
Imports are lazy so the rest of the app loads even before litellm is installed.
"""
from __future__ import annotations

import json
from typing import Optional

from app.config import settings


def chat(system: str, user: str, model: Optional[str] = None, temperature: float = 0.0) -> str:
    from litellm import completion  # lazy import

    resp = completion(
        model=model or settings.LLM_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
    )
    return resp["choices"][0]["message"]["content"]


def chat_json(system: str, user: str, model: Optional[str] = None) -> dict:
    """Ask the model for JSON and parse it defensively."""
    raw = chat(
        system + "\nRespond with ONLY valid JSON. No markdown, no commentary.",
        user,
        model=model,
    )
    return _extract_json(raw)


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        text = text[start : end + 1]
    return json.loads(text)

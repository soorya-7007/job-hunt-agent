"""Tool: extract raw text from a resume (PDF or plain text)."""
from __future__ import annotations

from pathlib import Path


def extract_text(file_path: str) -> str:
    path = Path(file_path)
    if path.suffix.lower() == ".pdf":
        return _extract_pdf(str(path))
    return path.read_text(encoding="utf-8", errors="ignore")


def _extract_pdf(file_path: str) -> str:
    import pdfplumber  # lazy import

    chunks = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            chunks.append(page.extract_text() or "")
    return "\n".join(chunks)

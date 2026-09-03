"""Tool: local, free embeddings via sentence-transformers + cosine similarity.

No API key required. The model downloads once on first use and then runs offline.
The model load is lazy so importing this module stays lightweight.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

import numpy as np

from app.config import settings


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer  # lazy, heavy import

    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed(texts: List[str]) -> np.ndarray:
    vecs = _model().encode(texts, normalize_embeddings=True)
    return np.asarray(vecs, dtype=np.float32)


def cosine_sim(a, b) -> float:
    """Cosine similarity between two 1-D vectors (pure numpy; unit-testable)."""
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    denom = float(np.linalg.norm(a) * np.linalg.norm(b)) or 1.0
    return float(np.dot(a, b) / denom)

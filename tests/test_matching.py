"""Lightweight tests that need no heavy models or API keys."""
import json
from pathlib import Path

import numpy as np

from app.schemas import JobPosting
from app.tools.embeddings import cosine_sim

SAMPLE = Path(__file__).resolve().parents[1] / "data" / "sample_jobs.json"


def test_cosine_sim_bounds():
    a = np.array([1.0, 0.0, 0.0])
    b = np.array([1.0, 0.0, 0.0])
    c = np.array([0.0, 1.0, 0.0])
    assert abs(cosine_sim(a, b) - 1.0) < 1e-6
    assert abs(cosine_sim(a, c) - 0.0) < 1e-6


def test_sample_jobs_valid():
    raw = json.loads(SAMPLE.read_text(encoding="utf-8"))
    jobs = [JobPosting(**j) for j in raw]
    assert len(jobs) >= 3
    assert all(j.title and j.id for j in jobs)

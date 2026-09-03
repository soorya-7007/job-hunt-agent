"""Application tracker — SQLite persistence via SQLAlchemy (the ORM real teams use).

Every job you choose to pursue is saved here with its stage in the pipeline:

    saved -> tailored -> applied -> interview -> offer -> rejected

Why a real database (not just a list)? So the agent — and you — can answer
"what's pending?" across sessions, and so the project demonstrates SQL data
modeling, a core backend skill recruiters look for.

The database file lives at data/applications.db (git-ignored). SQLAlchemy is
imported at module top, so import this module only when you actually need the
tracker (the UI does so lazily) to keep the rest of the app dependency-light.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
    select,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from app.schemas import Application

# Valid pipeline stages, in order (the UI shows these as a dropdown).
STATUSES = ["saved", "tailored", "applied", "interview", "offer", "rejected"]

_DEFAULT_DB = Path("data") / "applications.db"
_db_path = _DEFAULT_DB
_engine = None
_Session = None

Base = declarative_base()


class ApplicationRow(Base):
    """The `applications` table (see docs/BLUEPRINT.md §9 data model)."""

    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(128), nullable=False, index=True)
    job_title = Column(String(256), default="")
    company = Column(String(256), default="")
    location = Column(String(256), default="")
    url = Column(Text, default="")
    fit_score = Column(Float, default=0.0)
    status = Column(String(32), default="saved")
    tailored_summary = Column(Text, default="")
    tailored_bullets = Column(Text, default="[]")  # JSON-encoded list of strings
    notes = Column(Text, default="")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def configure(db_path) -> None:
    """Point the tracker at a specific SQLite file (used by tests). Resets state."""
    global _db_path, _engine, _Session
    _db_path = Path(db_path)
    _engine = None
    _Session = None


def _session():
    """Lazily create the engine + tables, then hand back a new Session."""
    global _engine, _Session
    if _Session is None:
        _db_path.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(f"sqlite:///{_db_path}", future=True)
        Base.metadata.create_all(_engine)
        _Session = sessionmaker(bind=_engine, future=True)
    return _Session()


def save_application(app: Application) -> Application:
    """Insert a new application, or update the existing row with the same job_id.

    Upserting by job_id means re-tailoring a job you already tracked updates that
    row instead of creating a duplicate.
    """
    with _session() as s:
        row = s.execute(
            select(ApplicationRow).where(ApplicationRow.job_id == app.job_id)
        ).scalar_one_or_none()
        if row is None:
            row = ApplicationRow(job_id=app.job_id)
            s.add(row)
        row.job_title = app.job_title
        row.company = app.company
        row.location = app.location
        row.url = app.url
        row.fit_score = app.fit_score
        row.status = app.status or "saved"
        row.tailored_summary = app.tailored_summary
        row.tailored_bullets = json.dumps(app.tailored_bullets or [])
        row.notes = app.notes
        row.updated_at = datetime.now(timezone.utc)
        s.commit()
        s.refresh(row)
        return _to_model(row)


def list_applications() -> List[Application]:
    """All tracked applications, most recently updated first."""
    with _session() as s:
        rows = (
            s.execute(select(ApplicationRow).order_by(ApplicationRow.updated_at.desc()))
            .scalars()
            .all()
        )
        return [_to_model(r) for r in rows]


def update_status(app_id: int, status: str) -> Optional[Application]:
    """Move an application to a new stage."""
    with _session() as s:
        row = s.get(ApplicationRow, app_id)
        if row is None:
            return None
        row.status = status
        row.updated_at = datetime.now(timezone.utc)
        s.commit()
        s.refresh(row)
        return _to_model(row)


def delete_application(app_id: int) -> bool:
    """Remove an application. Returns True if a row was deleted."""
    with _session() as s:
        row = s.get(ApplicationRow, app_id)
        if row is None:
            return False
        s.delete(row)
        s.commit()
        return True


def _to_model(row: "ApplicationRow") -> Application:
    """Convert a DB row into the shared Pydantic model."""
    return Application(
        id=row.id,
        job_id=row.job_id,
        job_title=row.job_title,
        company=row.company,
        location=row.location,
        url=row.url,
        fit_score=row.fit_score,
        status=row.status,
        tailored_summary=row.tailored_summary,
        tailored_bullets=json.loads(row.tailored_bullets or "[]"),
        notes=row.notes,
        updated_at=row.updated_at.isoformat() if row.updated_at else None,
    )

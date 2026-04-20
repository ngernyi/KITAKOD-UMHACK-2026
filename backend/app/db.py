"""SQLite connection helpers.

Design notes (mentor rationale):
- We use sqlite3 from the stdlib rather than SQLAlchemy to keep dependency
  surface small for a 1-week build. Upgrading to SQLAlchemy later requires
  only table-class definitions; raw SQL stays compatible.
- Every connection enables foreign keys (off by default in sqlite3).
- Connections are short-lived per request; no app-level connection pool.
  SQLite handles this fine for a single-user MVP.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

_SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def _connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path: Path) -> None:
    """Create tables if they do not yet exist. Safe to call on every startup."""

    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    schema = _SCHEMA_PATH.read_text(encoding="utf-8")
    with _connect(db_path) as conn:
        conn.executescript(schema)
        conn.commit()


@contextmanager
def get_conn(db_path: Path) -> Iterator[sqlite3.Connection]:
    """Context manager that yields a connection and commits on success."""

    conn = _connect(Path(db_path))
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

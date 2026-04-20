"""Driver profile persistence.

Single-user MVP: keyed by driver_id string. No auth.
"""

from __future__ import annotations

from datetime import datetime, timezone

from flask import current_app

from app.db import get_conn
from app.models import DriverProfile

DEFAULT_DRIVER_ID = "local"


def get_profile(driver_id: str = DEFAULT_DRIVER_ID) -> DriverProfile:
    db_path = current_app.config["DB_PATH"]
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT profile_json FROM drivers WHERE driver_id = ?",
            (driver_id,),
        ).fetchone()
        if not row:
            return DriverProfile(driver_id=driver_id)
        return DriverProfile.model_validate_json(row["profile_json"])


def upsert_profile(profile: DriverProfile) -> DriverProfile:
    db_path = current_app.config["DB_PATH"]
    with get_conn(db_path) as conn:
        conn.execute(
            """
            INSERT INTO drivers (driver_id, profile_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(driver_id) DO UPDATE SET
                profile_json = excluded.profile_json,
                updated_at   = excluded.updated_at
            """,
            (
                profile.driver_id,
                profile.model_dump_json(),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
    return profile

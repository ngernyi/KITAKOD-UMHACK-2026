"""Earnings ingestion service (Phase A stub).

Persists trips to SQLite and returns a summary of ingest results. Per-
platform CSV parsers are stubs that accept a minimal canonical schema
(``rows``). Proper platform-specific parsers ship in Phase C.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, List, Optional

from dateutil import parser as dateparser
from flask import current_app

from app.db import get_conn
from app.models import Platform, Trip
from app.models.trip import TripUpload


class IngestResult:
    def __init__(self, rows_inserted: int, date_range: tuple[Optional[str], Optional[str]], warnings: List[str]) -> None:
        self.rows_inserted = rows_inserted
        self.date_range = date_range
        self.warnings = warnings

    def to_dict(self) -> dict:
        return {
            "rows_inserted": self.rows_inserted,
            "date_range": list(self.date_range),
            "warnings": self.warnings,
        }


def ingest(upload: TripUpload) -> IngestResult:
    trips = list(_parse_upload(upload))
    if not trips:
        return IngestResult(0, (None, None), ["empty_upload"])

    db_path = current_app.config["DB_PATH"]
    inserted = 0
    duplicates = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_conn(db_path) as conn:
        for trip in trips:
            try:
                conn.execute(
                    """
                    INSERT INTO trips (
                        driver_id, platform, start_ts, end_ts, start_zone, end_zone,
                        distance_km, gross_rm, commission_rm, nett_rm, tip_rm,
                        surge_multiplier, source_upload_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        trip.driver_id,
                        trip.platform.value,
                        trip.start_ts.isoformat(),
                        trip.end_ts.isoformat(),
                        trip.start_zone,
                        trip.end_zone,
                        trip.distance_km,
                        trip.gross_rm,
                        trip.commission_rm,
                        trip.nett_rm,
                        trip.tip_rm,
                        trip.surge_multiplier,
                        trip.source_upload_id,
                        now_iso,
                    ),
                )
                inserted += 1
            except Exception as exc:
                if "UNIQUE" in str(exc):
                    duplicates += 1
                else:
                    raise

    dates = sorted(t.start_ts.date().isoformat() for t in trips)
    warnings = []
    if duplicates:
        warnings.append(f"duplicates_skipped:{duplicates}")
    return IngestResult(inserted, (dates[0], dates[-1]), warnings)


def _parse_upload(upload: TripUpload) -> Iterable[Trip]:
    if upload.rows:
        for r in upload.rows:
            yield _row_to_trip(r, upload.platform, upload.driver_id)
    elif upload.csv_text:
        yield from _parse_csv_text(upload.csv_text, upload.platform, upload.driver_id)


def _row_to_trip(row: dict, platform: Platform, driver_id: str) -> Trip:
    return Trip(
        driver_id=driver_id,
        platform=platform,
        start_ts=dateparser.isoparse(row["start_ts"]),
        end_ts=dateparser.isoparse(row["end_ts"]),
        start_zone=row["start_zone"],
        end_zone=row.get("end_zone"),
        distance_km=float(row["distance_km"]),
        gross_rm=float(row["gross_rm"]),
        commission_rm=float(row["commission_rm"]),
        nett_rm=float(row["nett_rm"]),
        tip_rm=float(row.get("tip_rm", 0.0)),
        surge_multiplier=float(row.get("surge_multiplier", 1.0)),
    )


def _parse_csv_text(csv_text: str, platform: Platform, driver_id: str):
    import csv
    import io

    reader = csv.DictReader(io.StringIO(csv_text))
    for row in reader:
        yield _row_to_trip(row, platform, driver_id)


def list_trips(driver_id: str = "local", days: int = 14) -> List[Trip]:
    db_path = current_app.config["DB_PATH"]
    cutoff = (datetime.now(timezone.utc) - _days_delta(days)).isoformat()
    with get_conn(db_path) as conn:
        rows = conn.execute(
            """
            SELECT * FROM trips
            WHERE driver_id = ? AND start_ts >= ?
            ORDER BY start_ts ASC
            """,
            (driver_id, cutoff),
        ).fetchall()
    return [_row_to_model(r) for r in rows]


def _days_delta(days: int):
    from datetime import timedelta

    return timedelta(days=days)


def _row_to_model(row) -> Trip:
    return Trip(
        id=row["id"],
        driver_id=row["driver_id"],
        platform=Platform(row["platform"]),
        start_ts=dateparser.isoparse(row["start_ts"]),
        end_ts=dateparser.isoparse(row["end_ts"]),
        start_zone=row["start_zone"],
        end_zone=row["end_zone"],
        distance_km=row["distance_km"],
        gross_rm=row["gross_rm"],
        commission_rm=row["commission_rm"],
        nett_rm=row["nett_rm"],
        tip_rm=row["tip_rm"],
        surge_multiplier=row["surge_multiplier"],
        source_upload_id=row["source_upload_id"],
    )

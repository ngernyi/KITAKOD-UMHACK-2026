"""Earnings ingestion service.

Accepts trip data from each platform in its own native column naming,
maps to a canonical Trip schema, resolves fuzzy zone names, and persists.
Mentor notes:

- Platform exporters use different column names for the same concept.
  Instead of writing one parser per platform, we keep a single CSV
  dialect and per-platform alias maps from foreign column names to
  canonical fields. Adding a new platform = adding an alias dict.
- Zone ids on disk are the canonical keys ('petaling_jaya_ss2'), but
  drivers paste labels like 'PJ' or 'KL Sentral'. zone_resolver.py
  handles that.
- Rows that cannot be resolved are skipped with a warning - we never
  insert garbage zones, because plans are validated against the zone
  whitelist at generation time.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Optional

from dateutil import parser as dateparser
from flask import current_app

from app.db import get_conn
from app.models import Platform, Trip
from app.models.trip import TripUpload
from app.services.zone_resolver import resolve as resolve_zone


# -------- Per-platform column alias maps --------
# Keys are canonical field names; values are lists of accepted column
# headers (case-insensitive) that map to them. First match wins.

_COMMON_ALIASES: dict[str, list[str]] = {
    "start_ts": ["start_ts", "start", "pickup_time", "pick up time", "pickup_ts", "datetime", "date_time", "booking_time", "trip_date"],
    "end_ts":   ["end_ts", "end", "drop_off_time", "drop off time", "dropoff_ts", "completion_time", "end_time", "finish"],
    "start_zone": ["start_zone", "zone", "pickup", "pick up", "pickup_area", "pickup area", "origin", "from"],
    "end_zone":   ["end_zone", "dropoff", "drop off", "dropoff_area", "destination", "to"],
    "distance_km": ["distance_km", "distance", "km", "trip_distance", "trip distance"],
    "gross_rm":    ["gross_rm", "gross", "fare", "total_fare", "total fare", "fare_rm"],
    "commission_rm": ["commission_rm", "commission", "service_fee", "service fee", "platform_fee", "platform fee"],
    "nett_rm":     ["nett_rm", "net", "net_earning", "net earning", "net_earnings", "net earnings", "driver_earning", "driver earning", "take_home", "take home"],
    "tip_rm":      ["tip_rm", "tip", "tips"],
    "surge_multiplier": ["surge_multiplier", "surge", "multiplier", "boost"],
}

# Platform-specific overrides. Only needed where a platform disagrees
# with the common names. Empty dicts are fine - common aliases cover
# most cases.
_PLATFORM_ALIASES: dict[Platform, dict[str, list[str]]] = {
    Platform.GRAB: {
        "start_ts":      ["booking_time", "pickup_time", "pickup_ts"],
        "start_zone":    ["pickup_area", "pickup_location"],
        "end_zone":      ["dropoff_area", "dropoff_location"],
        "gross_rm":      ["total_fare"],
        "commission_rm": ["grab_service_fee", "service_fee"],
        "nett_rm":       ["driver_earning", "nett_earning"],
    },
    Platform.MAXIM: {
        "start_ts":      ["order_time", "start_time"],
        "start_zone":    ["origin_area", "pickup_area"],
        "end_zone":      ["destination_area", "dropoff_area"],
        "gross_rm":      ["fare"],
        "commission_rm": ["maxim_fee", "platform_fee"],
        "nett_rm":       ["driver_earnings", "net"],
    },
    Platform.AIRASIA: {
        "start_ts":      ["pickup_datetime", "pick_up"],
        "start_zone":    ["pickup_location"],
        "end_zone":      ["dropoff_location"],
        "gross_rm":      ["trip_fare", "total_amount"],
        "commission_rm": ["airasia_commission", "service_fee"],
        "nett_rm":       ["net_payable", "driver_payout"],
    },
    Platform.INDRIVE: {
        "start_ts":      ["ride_start", "pickup_ts"],
        "start_zone":    ["from", "pickup"],
        "end_zone":      ["to", "dropoff"],
        "gross_rm":      ["ride_price", "price"],
        "commission_rm": ["service_charge"],
        "nett_rm":       ["driver_take", "nett"],
    },
}

CANONICAL_COLUMNS = [
    "start_ts", "end_ts", "start_zone", "end_zone",
    "distance_km", "gross_rm", "commission_rm", "nett_rm",
    "tip_rm", "surge_multiplier",
]


@dataclass
class IngestResult:
    rows_inserted: int
    date_range: tuple[Optional[str], Optional[str]]
    duplicates_skipped: int = 0
    rows_rejected: int = 0
    rejection_reasons: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "rows_inserted": self.rows_inserted,
            "duplicates_skipped": self.duplicates_skipped,
            "rows_rejected": self.rows_rejected,
            "rejection_reasons": self.rejection_reasons[:20],
            "date_range": list(self.date_range),
            "warnings": self.warnings,
        }


def ingest(upload: TripUpload) -> IngestResult:
    parsed: list[Trip] = []
    rejections: list[str] = []

    for raw_row, source_idx in _source_rows(upload):
        try:
            trip = _row_to_trip(raw_row, upload.platform, upload.driver_id)
        except _RowError as exc:
            rejections.append(f"row {source_idx}: {exc}")
            continue
        parsed.append(trip)

    if not parsed and not rejections:
        return IngestResult(0, (None, None), warnings=["empty_upload"])

    inserted, duplicates = _persist(parsed)

    dates = sorted(t.start_ts.date().isoformat() for t in parsed) or [None, None]
    return IngestResult(
        rows_inserted=inserted,
        date_range=(dates[0], dates[-1]) if dates[0] else (None, None),
        duplicates_skipped=duplicates,
        rows_rejected=len(rejections),
        rejection_reasons=rejections,
    )


def _source_rows(upload: TripUpload) -> Iterable[tuple[dict, int]]:
    """Yield (row_dict, source_index) pairs from either structured rows or CSV text."""

    if upload.rows:
        for i, r in enumerate(upload.rows):
            yield r, i + 1
        return
    if upload.csv_text:
        reader = csv.DictReader(io.StringIO(upload.csv_text.strip()))
        for i, row in enumerate(reader):
            yield {k.strip(): v for k, v in row.items() if k is not None}, i + 2  # +2 = header row


class _RowError(ValueError):
    pass


def _row_to_trip(row: dict, platform: Platform, driver_id: str) -> Trip:
    def pick(field_name: str, required: bool = True, default=None):
        value = _find_field(row, field_name, platform)
        if value is None or value == "":
            if required:
                raise _RowError(f"missing field '{field_name}'")
            return default
        return value

    start_raw = pick("start_ts")
    end_raw = pick("end_ts", required=False)
    start_ts = _parse_dt(start_raw, "start_ts")
    end_ts = _parse_dt(end_raw, "end_ts") if end_raw else start_ts + timedelta(minutes=15)

    start_zone_raw = pick("start_zone")
    zone_id = resolve_zone(str(start_zone_raw))
    if zone_id is None:
        raise _RowError(f"unknown pickup area '{start_zone_raw}' (not matched to any zone)")

    end_zone_raw = pick("end_zone", required=False)
    end_zone_id = resolve_zone(str(end_zone_raw)) if end_zone_raw else None

    try:
        gross = float(pick("gross_rm"))
    except (TypeError, ValueError):
        raise _RowError("gross_rm is not a number")

    try:
        commission_val = pick("commission_rm", required=False, default=None)
        commission = float(commission_val) if commission_val not in (None, "") else round(gross * 0.2, 2)
    except (TypeError, ValueError):
        raise _RowError("commission_rm is not a number")

    try:
        nett_val = pick("nett_rm", required=False, default=None)
        nett = float(nett_val) if nett_val not in (None, "") else round(gross - commission, 2)
    except (TypeError, ValueError):
        raise _RowError("nett_rm is not a number")

    try:
        distance_val = pick("distance_km", required=False, default=0.0)
        distance = float(distance_val) if distance_val not in (None, "") else 0.0
    except (TypeError, ValueError):
        raise _RowError("distance_km is not a number")

    tip = _safe_float(pick("tip_rm", required=False, default=0.0))
    surge = _safe_float(pick("surge_multiplier", required=False, default=1.0)) or 1.0

    return Trip(
        driver_id=driver_id,
        platform=platform,
        start_ts=start_ts,
        end_ts=end_ts,
        start_zone=zone_id,
        end_zone=end_zone_id,
        distance_km=max(0.0, distance),
        gross_rm=max(0.0, gross),
        commission_rm=max(0.0, commission),
        nett_rm=max(0.0, nett),
        tip_rm=max(0.0, tip),
        surge_multiplier=max(0.5, min(5.0, surge)),
    )


def _find_field(row: dict, canonical: str, platform: Platform):
    """Look for any of the accepted column names for `canonical`.
    Platform-specific aliases win over common aliases.
    """

    # Normalise row keys once.
    row_lc = {str(k).strip().lower().replace("-", "_").replace(" ", "_"): v for k, v in row.items()}
    platform_aliases = _PLATFORM_ALIASES.get(platform, {}).get(canonical, [])
    common_aliases = _COMMON_ALIASES.get(canonical, [])
    for alias in (*platform_aliases, canonical, *common_aliases):
        key = alias.strip().lower().replace("-", "_").replace(" ", "_")
        if key in row_lc and row_lc[key] not in (None, ""):
            return row_lc[key]
    return None


def _parse_dt(value, field_name: str) -> datetime:
    try:
        dt = dateparser.isoparse(str(value))
    except (TypeError, ValueError):
        try:
            dt = dateparser.parse(str(value))
        except (TypeError, ValueError) as exc:
            raise _RowError(f"cannot parse {field_name}='{value}'") from exc
    if dt.tzinfo is None:
        # Assume Malaysia time (+08:00) when no zone is given.
        from datetime import timezone as _tz
        dt = dt.replace(tzinfo=_tz(timedelta(hours=8)))
    return dt


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _persist(trips: list[Trip]) -> tuple[int, int]:
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
    return inserted, duplicates


def list_trips(driver_id: str = "local", days: int = 14) -> List[Trip]:
    db_path = current_app.config["DB_PATH"]
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
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


def csv_template(platform: Platform) -> str:
    """Return a CSV template with the canonical headers and a single
    illustrative row. Drivers paste their own rows under the header.
    """

    _ = platform  # reserved for future per-platform examples
    sample = {
        "start_ts":          "2026-04-18T18:15:00+08:00",
        "end_ts":            "2026-04-18T18:47:00+08:00",
        "start_zone":        "Bangsar",
        "end_zone":          "KLCC",
        "distance_km":       "9.4",
        "gross_rm":          "22.50",
        "commission_rm":     "4.50",
        "nett_rm":           "18.00",
        "tip_rm":            "0.00",
        "surge_multiplier":  "1.00",
    }
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CANONICAL_COLUMNS)
    writer.writeheader()
    writer.writerow(sample)
    return output.getvalue()


def totals(driver_id: str = "local", days: int = 14) -> dict:
    trips = list_trips(driver_id=driver_id, days=days)
    total_gross = sum(t.gross_rm for t in trips)
    total_nett = sum(t.nett_rm for t in trips)
    return {
        "trip_count": len(trips),
        "total_gross_rm": round(total_gross, 2),
        "total_nett_rm": round(total_nett, 2),
        "days": days,
    }

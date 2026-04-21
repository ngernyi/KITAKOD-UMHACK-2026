"""Seed the local SQLite with a realistic 60-day trip history.

Why this exists:
    A fresh clone of GigShift has an empty database. Dashboards are
    blank, backtests produce zero baseline, and plans fall back to
    stock defaults because there's no history to personalise against.
    Judges / teammates shouldn't have to hand-craft CSVs before the
    app looks alive.

What it produces:
    ~60 days of trips for driver_id="local" across all four supported
    platforms (grab, maxim, airasia_ride, indrive), with:
      - Weekday and weekend working patterns (longer hours weekends)
      - Morning (07-09) and evening (17-21) peak density
      - Realistic zone affinities (PJ/Bangsar are home base, KLIA a few
        times a week, weekend malls)
      - Platform-specific nett-per-hour distributions (Grab highest,
        Maxim closer to driver-take, etc.)
      - Surge on rainy/event-looking days
      - Determinism: same seed -> same output, so demo screenshots
        stay stable.

Usage:
    cd backend
    python -m scripts.seed_demo_data                 # 60 days, driver=local
    python -m scripts.seed_demo_data --days 30
    python -m scripts.seed_demo_data --reset         # wipes trips first
    python -m scripts.seed_demo_data --driver-id bob

Design note:
    This script writes DIRECTLY to the trips table rather than calling
    earnings_service.ingest(). That's intentional - ingest() is built
    to validate noisy real-world CSVs (aliases, fuzzy zones, per-row
    rejection). Seeding is a trusted internal operation where the
    inputs are already canonical. Bypassing ingest() keeps this
    fast and avoids coupling the seeder to parsing logic.
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import create_app  # noqa: E402
from app.db import get_conn  # noqa: E402
from app.models import Platform  # noqa: E402


# -------- Synthetic-world calibration --------
# All numbers below are calibrated to Klang Valley e-hailing realities
# circa 2025-2026 (driver-forum reports, public aggregator studies).
# They're conservative: the demo shows plausible, not rosy, earnings.

PLATFORMS: list[Platform] = [
    Platform.GRAB,
    Platform.MAXIM,
    Platform.AIRASIA,
    Platform.INDRIVE,
]

# Each platform's base nett RM/hour range. Grab pays higher absolute
# fares but takes the largest commission; drivers' take-home is close
# across platforms. These are plausible *nett* numbers.
PLATFORM_NETT_RANGE: dict[Platform, tuple[float, float]] = {
    Platform.GRAB:     (16.0, 34.0),
    Platform.MAXIM:    (13.0, 28.0),
    Platform.AIRASIA:  (15.0, 30.0),
    Platform.INDRIVE:  (12.0, 26.0),
}

# Commission-rate ranges by platform (portion of gross taken by the app).
PLATFORM_COMMISSION_PCT: dict[Platform, tuple[float, float]] = {
    Platform.GRAB:     (0.20, 0.25),
    Platform.MAXIM:    (0.09, 0.14),
    Platform.AIRASIA:  (0.15, 0.20),
    Platform.INDRIVE:  (0.00, 0.10),
}

# Driver's zone affinity — weights for which zone a trip STARTS in.
# Chosen to look like a PJ/KL-center driver who dips into KLIA a few
# times a week and covers weekend mall peaks.
ZONE_WEIGHTS: dict[str, float] = {
    "petaling_jaya_ss2":         1.00,
    "bangsar":                   0.85,
    "mid_valley":                0.80,
    "klcc":                      0.75,
    "bukit_bintang":             0.60,
    "sunway":                    0.55,
    "mont_kiara_sri_hartamas":   0.50,
    "kota_damansara":            0.45,
    "subang_jaya":               0.40,
    "puchong":                   0.35,
    "cheras":                    0.35,
    "klia_klia2":                0.25,
    "shah_alam":                 0.20,
    "ampang":                    0.15,
    "setapak_wangsa_maju":       0.15,
    "cyberjaya_putrajaya":       0.15,
    "kepong":                    0.10,
    "klang":                     0.08,
}

# Platform market-share per hour of day - roughly matches which platform
# a rational driver would open first at that hour (airport runs favour
# AirAsia Ride, suburban dinner runs favour Grab, late-night cheap runs
# tilt toward inDrive/Maxim).
PLATFORM_HOUR_WEIGHTS: dict[int, dict[Platform, float]] = {
    # Pre-dawn / early morning: airport runs
    **{h: {Platform.AIRASIA: 2.0, Platform.GRAB: 1.5, Platform.MAXIM: 1.0, Platform.INDRIVE: 0.8} for h in range(5, 9)},
    # Mid-morning: Grab dominates
    **{h: {Platform.GRAB: 2.0, Platform.MAXIM: 1.2, Platform.AIRASIA: 1.0, Platform.INDRIVE: 0.8} for h in range(9, 12)},
    # Lunch: Grab + Maxim
    **{h: {Platform.GRAB: 1.8, Platform.MAXIM: 1.5, Platform.AIRASIA: 1.0, Platform.INDRIVE: 0.9} for h in range(12, 14)},
    # Afternoon
    **{h: {Platform.GRAB: 1.6, Platform.MAXIM: 1.3, Platform.AIRASIA: 1.0, Platform.INDRIVE: 1.0} for h in range(14, 17)},
    # Evening peak: Grab premium
    **{h: {Platform.GRAB: 2.2, Platform.MAXIM: 1.4, Platform.AIRASIA: 1.1, Platform.INDRIVE: 0.9} for h in range(17, 21)},
    # Late evening
    **{h: {Platform.GRAB: 1.6, Platform.MAXIM: 1.6, Platform.AIRASIA: 1.0, Platform.INDRIVE: 1.2} for h in range(21, 24)},
    # Late night
    **{h: {Platform.MAXIM: 1.8, Platform.INDRIVE: 1.6, Platform.GRAB: 1.2, Platform.AIRASIA: 0.6} for h in range(0, 5)},
}


def _weighted_choice(rng: random.Random, weights: dict):
    keys = list(weights.keys())
    wts = [weights[k] for k in keys]
    return rng.choices(keys, weights=wts, k=1)[0]


def _hour_density(hour: int, is_weekend: bool) -> float:
    """Return a 0..1 probability that the driver works at this hour."""
    # Weekday pattern: two peaks (morning + evening rush)
    if not is_weekend:
        if 7 <= hour <= 9:   return 0.70   # AM rush
        if 12 <= hour <= 14: return 0.55   # Lunch
        if 17 <= hour <= 21: return 0.80   # PM rush + dinner
        if 22 <= hour <= 23: return 0.35
        if 10 <= hour <= 11: return 0.40
        if 15 <= hour <= 16: return 0.35
        if 0 <= hour <= 2:   return 0.10   # Late night
        return 0.05
    # Weekend pattern: later start, longer evening
    if 10 <= hour <= 12: return 0.55
    if 13 <= hour <= 16: return 0.50
    if 17 <= hour <= 22: return 0.85
    if 23 <= hour <= 23: return 0.45
    if 0 <= hour <= 1:   return 0.25
    return 0.08


def _trip_duration_minutes(rng: random.Random, hour: int) -> float:
    """Most trips 10-30 min, occasional 45+ min airport/outstation runs."""
    # 10% chance of a long trip
    if rng.random() < 0.10:
        return rng.uniform(40.0, 70.0)
    return rng.uniform(8.0, 28.0)


def _distance_from_duration(rng: random.Random, minutes: float) -> float:
    """Rough KL traffic: ~0.35-0.65 km per minute of driving."""
    kpm = rng.uniform(0.35, 0.65)
    return round(minutes * kpm, 1)


def _rainy_day(rng: random.Random, date: datetime) -> bool:
    """30% of days have an afternoon shower (KL tropical baseline)."""
    # Seed per-date so same date -> same weather across runs with same seed.
    return rng.random() < 0.30


def _surge_multiplier(rng: random.Random, hour: int, is_weekend: bool, rainy: bool) -> float:
    base = 1.0
    if rainy and 16 <= hour <= 21:
        base += rng.uniform(0.2, 0.6)
    if hour in (8, 18, 19, 20) and not is_weekend:
        base += rng.uniform(0.1, 0.4)
    if is_weekend and 19 <= hour <= 22:
        base += rng.uniform(0.0, 0.3)
    return round(base, 2)


def generate_trips(
    driver_id: str,
    days: int,
    seed: int,
    end_date: datetime,
) -> list[dict]:
    """Deterministic trip generator. Returns list of dicts ready for INSERT."""
    rng = random.Random(seed)
    trips: list[dict] = []
    start_date = (end_date - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)

    current = start_date
    while current < end_date:
        is_weekend = current.weekday() >= 5
        # Per-day RNG fork so tweaking one day doesn't shift the whole history.
        day_rng = random.Random(seed ^ hash(current.strftime("%Y-%m-%d")))
        rainy = _rainy_day(day_rng, current)
        # 10% of days are rest days (no trips at all).
        if day_rng.random() < 0.10:
            current += timedelta(days=1)
            continue

        for hour in range(0, 24):
            density = _hour_density(hour, is_weekend)
            if day_rng.random() > density:
                continue

            # Driver works this hour — generate 1 to 3 trips in it.
            trip_count = day_rng.choices([1, 2, 3], weights=[0.4, 0.45, 0.15], k=1)[0]
            for i in range(trip_count):
                minute_offset = int(day_rng.uniform(0, 59))
                start_ts = current.replace(hour=hour, minute=minute_offset, second=0, microsecond=0)
                duration_min = _trip_duration_minutes(day_rng, hour)
                end_ts = start_ts + timedelta(minutes=duration_min)
                distance_km = _distance_from_duration(day_rng, duration_min)
                start_zone = _weighted_choice(day_rng, ZONE_WEIGHTS)
                end_zone = _weighted_choice(day_rng, ZONE_WEIGHTS)

                # Airport runs are long — override duration if start or end is KLIA.
                if start_zone == "klia_klia2" or end_zone == "klia_klia2":
                    duration_min = day_rng.uniform(45.0, 75.0)
                    end_ts = start_ts + timedelta(minutes=duration_min)
                    distance_km = round(day_rng.uniform(45.0, 75.0), 1)

                platform = _weighted_choice(day_rng, PLATFORM_HOUR_WEIGHTS[hour])
                nett_per_hour_lo, nett_per_hour_hi = PLATFORM_NETT_RANGE[platform]
                nett_per_hour = day_rng.uniform(nett_per_hour_lo, nett_per_hour_hi)
                nett_rm = round(nett_per_hour * (duration_min / 60.0), 2)

                commission_lo, commission_hi = PLATFORM_COMMISSION_PCT[platform]
                commission_pct = day_rng.uniform(commission_lo, commission_hi)
                # gross * (1 - commission_pct) = nett  =>  gross = nett / (1 - pct)
                gross_rm = round(nett_rm / max(0.01, 1.0 - commission_pct), 2)
                commission_rm = round(gross_rm - nett_rm, 2)

                surge = _surge_multiplier(day_rng, hour, is_weekend, rainy)
                if surge > 1.0:
                    surge_bonus = nett_rm * (surge - 1.0) * 0.5
                    nett_rm = round(nett_rm + surge_bonus, 2)
                    gross_rm = round(gross_rm + surge_bonus, 2)

                tip_rm = 0.0
                if day_rng.random() < 0.08:
                    tip_rm = round(day_rng.uniform(1.0, 8.0), 2)
                    nett_rm = round(nett_rm + tip_rm, 2)

                trips.append({
                    "driver_id": driver_id,
                    "platform": platform.value,
                    "start_ts": start_ts.replace(tzinfo=timezone.utc).isoformat(),
                    "end_ts": end_ts.replace(tzinfo=timezone.utc).isoformat(),
                    "start_zone": start_zone,
                    "end_zone": end_zone,
                    "distance_km": distance_km,
                    "gross_rm": gross_rm,
                    "commission_rm": max(0.0, commission_rm),
                    "nett_rm": nett_rm,
                    "tip_rm": tip_rm,
                    "surge_multiplier": surge,
                })

        current += timedelta(days=1)

    return trips


def insert_trips(trips: Iterable[dict], db_path: Path) -> tuple[int, int]:
    inserted = 0
    duplicates = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_conn(str(db_path)) as conn:
        for t in trips:
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
                        t["driver_id"], t["platform"],
                        t["start_ts"], t["end_ts"],
                        t["start_zone"], t["end_zone"],
                        t["distance_km"], t["gross_rm"],
                        t["commission_rm"], t["nett_rm"],
                        t["tip_rm"], t["surge_multiplier"],
                        None, now_iso,
                    ),
                )
                inserted += 1
            except Exception as exc:
                if "UNIQUE" in str(exc):
                    duplicates += 1
                else:
                    raise
    return inserted, duplicates


def reset_trips(driver_id: str, db_path: Path) -> int:
    with get_conn(str(db_path)) as conn:
        cursor = conn.execute(
            "DELETE FROM trips WHERE driver_id = ?",
            (driver_id,),
        )
        return cursor.rowcount or 0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed demo trip data for GigShift.")
    parser.add_argument("--days", type=int, default=60, help="Days of history (default 60).")
    parser.add_argument("--driver-id", default="local", help="Driver id to seed (default local).")
    parser.add_argument("--seed", type=int, default=20260420, help="Random seed for determinism.")
    parser.add_argument("--reset", action="store_true", help="Wipe existing trips for this driver first.")
    parser.add_argument("--end-date", default=None, help="YYYY-MM-DD end date (default: today UTC).")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    app = create_app()
    with app.app_context():
        db_path = Path(app.config["DB_PATH"])
        end_date = (
            datetime.fromisoformat(args.end_date).replace(tzinfo=timezone.utc)
            if args.end_date
            else datetime.now(timezone.utc)
        )
        end_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)

        if args.reset:
            deleted = reset_trips(args.driver_id, db_path)
            print(f"reset: deleted {deleted} existing trip(s) for driver_id={args.driver_id!r}")

        print(
            f"generating {args.days} days ending {end_date.strftime('%Y-%m-%d')} "
            f"(seed={args.seed}, driver_id={args.driver_id!r})…"
        )
        trips = generate_trips(args.driver_id, args.days, args.seed, end_date)
        print(f"generated: {len(trips)} synthetic trip(s)")

        inserted, dupes = insert_trips(trips, db_path)
        print(f"inserted: {inserted} new, {dupes} duplicates skipped")

        # Human-readable totals so the user can sanity-check.
        with get_conn(str(db_path)) as conn:
            row = conn.execute(
                """
                SELECT COUNT(*) AS n,
                       ROUND(SUM(nett_rm), 2) AS total_nett,
                       MIN(start_ts) AS first_ts,
                       MAX(start_ts) AS last_ts
                FROM trips WHERE driver_id = ?
                """,
                (args.driver_id,),
            ).fetchone()
        print(
            f"driver_id={args.driver_id!r} now has {row['n']} trips, "
            f"total nett = RM {row['total_nett']} "
            f"({row['first_ts']} -> {row['last_ts']})"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

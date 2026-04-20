"""External Data Service.

Responsibilities:
- Produce a DailySignals object for any shift date.
- Prefer: live API (OpenWeather, Calendarific) when keys available.
- Fallback: seeded JSON under backend/data/*.
- Cache results by date in the daily_signals SQLite table for 24h.

For the preliminary round we implement the fallback path (seeded JSONs)
only. Live API calls slot in later by swapping the helper functions.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from dateutil import parser as dateparser
from flask import current_app

from app.config import DATA_DIR
from app.db import get_conn
from app.models import (
    CrowdSize,
    DailySignals,
    EventSnapshot,
    WeatherSnapshot,
)
from app.models.signals import FuelPrices, HolidaySnapshot

CACHE_TTL_HOURS = 24


@lru_cache(maxsize=1)
def _load_zones() -> dict:
    return json.loads((DATA_DIR / "zones_kl.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _load_holidays() -> dict:
    return json.loads((DATA_DIR / "holidays_my_2026.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _load_fuel() -> dict:
    return json.loads((DATA_DIR / "fuel_price_my.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _load_events() -> dict:
    return json.loads((DATA_DIR / "events_kl.json").read_text(encoding="utf-8"))


def zone_whitelist() -> List[dict]:
    """Return the full zone whitelist for prompt injection."""

    return _load_zones()["zones"]


def zone_ids() -> List[str]:
    return [z["id"] for z in zone_whitelist()]


def _holidays_on(date_iso: str) -> List[HolidaySnapshot]:
    data = _load_holidays()
    return [
        HolidaySnapshot(date=h["date"], name=h["name"], type=h["type"])
        for h in data.get("holidays", [])
        if h["date"] == date_iso
    ]


def _is_school_break(date_iso: str) -> bool:
    data = _load_holidays()
    target = dateparser.isoparse(date_iso).date()
    for b in data.get("school_breaks", []):
        start = dateparser.isoparse(b["start"]).date()
        end = dateparser.isoparse(b["end"]).date()
        if start <= target <= end:
            return True
    return False


def _fuel_prices_for(date_iso: str) -> FuelPrices:
    data = _load_fuel()
    target = dateparser.isoparse(date_iso).date()
    best_match = data["active_week"]
    for entry in data.get("history", []):
        ws = dateparser.isoparse(entry["week_start"]).date()
        if ws <= target:
            best_match = {
                "start": entry["week_start"],
                "ron95": entry["ron95"],
                "ron97": entry["ron97"],
                "diesel": entry["diesel"],
            }
    return FuelPrices(
        ron95=best_match["ron95"],
        ron97=best_match["ron97"],
        diesel=best_match["diesel"],
        week_start=best_match["start"],
    )


def _events_for(date_iso: str) -> List[EventSnapshot]:
    data = _load_events()
    target_date = dateparser.isoparse(date_iso).date()
    out: list[EventSnapshot] = []
    for e in data.get("events", []):
        start = dateparser.isoparse(e["start_ts"])
        end = dateparser.isoparse(e["end_ts"])
        if start.date() <= target_date <= end.date():
            out.append(
                EventSnapshot(
                    id=e["id"],
                    name=e["name"],
                    venue=e["venue"],
                    zone=e["zone"],
                    secondary_zones=e.get("secondary_zones", []),
                    start_ts=start,
                    end_ts=end,
                    expected_crowd=CrowdSize(e["expected_crowd"]),
                    notes=e.get("notes", ""),
                )
            )
    return out


def _weather_fallback(date_iso: str) -> WeatherSnapshot:
    """Deterministic stub weather so the pipeline never stalls without a key."""

    day_of_year = dateparser.isoparse(date_iso).timetuple().tm_yday
    is_likely_rainy = day_of_year % 3 == 0
    return WeatherSnapshot(
        condition="light rain" if is_likely_rainy else "partly cloudy",
        temperature_c=29.5 - (2.0 if is_likely_rainy else 0.0),
        rain_mm=4.5 if is_likely_rainy else 0.2,
        wind_kph=12.0,
        cloud_cover_pct=60.0 if is_likely_rainy else 35.0,
    )


def _fetch_weather_live(date_iso: str) -> Optional[WeatherSnapshot]:
    """Placeholder for live OpenWeather fetch (wired up in a later phase)."""

    if not current_app.config.get("OPENWEATHER_API_KEY"):
        return None
    return None


def _get_cached(date_iso: str) -> Optional[DailySignals]:
    db_path = current_app.config["DB_PATH"]
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT signals_json, generated_at FROM daily_signals WHERE date = ?",
            (date_iso,),
        ).fetchone()
        if not row:
            return None
        generated_at = dateparser.isoparse(row["generated_at"])
        age_hours = (datetime.now(timezone.utc) - generated_at).total_seconds() / 3600
        if age_hours > CACHE_TTL_HOURS:
            return None
        return DailySignals.model_validate_json(row["signals_json"])


def _put_cached(signals: DailySignals) -> None:
    db_path = current_app.config["DB_PATH"]
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO daily_signals (date, signals_json, generated_at) VALUES (?, ?, ?)",
            (
                signals.date,
                signals.model_dump_json(),
                signals.generated_at.isoformat(),
            ),
        )


def get_daily_signals(date_iso: str, use_cache: bool = True) -> DailySignals:
    """Return all external signals for the given date.

    The returned object is safe to pass into the GLM prompt — it contains
    only structured, sanitised, zone-whitelisted data.
    """

    if use_cache:
        cached = _get_cached(date_iso)
        if cached is not None:
            return cached

    warnings: list[str] = []

    weather = _fetch_weather_live(date_iso) or _weather_fallback(date_iso)
    if weather is _weather_fallback(date_iso):
        warnings.append("weather_seeded")

    signals = DailySignals(
        date=date_iso,
        weather=weather,
        public_holidays=_holidays_on(date_iso),
        school_break=_is_school_break(date_iso),
        fuel=_fuel_prices_for(date_iso),
        events=_events_for(date_iso),
        warnings=warnings,
        generated_at=datetime.now(timezone.utc),
    )
    _put_cached(signals)
    return signals

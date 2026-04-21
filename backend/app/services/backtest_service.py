"""Backtest service.

The plan pipeline answers "what should I do tonight?". The backtest
pipeline answers "would this have made me more money last week?". It
is the single most persuasive thing we can put in front of judges
because it turns an LLM output into a concrete RM number.

Design notes (mentor):

1. NO DATA LEAKAGE.
   When we replay day D, the rate matrix and analytics summary are
   built from trips STRICTLY BEFORE D. Otherwise the projection has
   "seen the answer" and inflates trivially.

2. EMPIRICAL RATES, WITH A FALLBACK CHAIN.
   For each plan slot (zone, hour, platform) we look up the driver's
   own RM/hr. If that exact combo has <2 data points we fall back to
   (zone, hour), then (zone), then overall RM/hr, then a conservative
   default. Each slot records which level was used -> auditable.

3. HONEST DELTA.
   baseline = actual nett earned in the window.
   projected = sum of plan slots * empirical rate * duration.
   delta = projected - baseline.
   We never invent uplift. If history is thin, delta is thin too.

4. SIGNALS ARE HISTORICAL.
   We re-seed DailySignals for the replayed date, not today. That way
   events / holidays / weather for that specific day drive the plan.

5. ONE PLAN PER DAY.
   We pick a sensible fixed 6h window per day (default: 16:00-22:00
   local). Keeps runs fast and avoids combinatorics. Future work:
   align each day to the driver's typical hours from profile.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Iterable, List, Optional, Tuple

from flask import current_app

from app.models import (
    AnalyticsSummary,
    BacktestDay,
    BacktestResult,
    BacktestSlotProjection,
    Platform,
    Plan,
    Trip,
)
from app.models.profile import TimeWindow
from app.services import analytics_service, external_data_service, glm_service
from app.services.earnings_service import list_trips as list_trips_days
from app.services.profile_service import get_profile

# How far back to build the rate matrix. Generous so even sparse
# drivers can replay at least a few days.
RATE_MATRIX_LOOKBACK_DAYS = 60

# Minimum samples we trust for a specific bucket. Below this, fall back.
MIN_SAMPLES_FOR_BUCKET = 2

# Conservative floor used only when history is completely empty.
DEFAULT_RM_PER_HOUR = 15.0

# Default replay window per day when the caller doesn't specify one.
DEFAULT_DAILY_WINDOW = (time(hour=16), time(hour=22))

# MYT is +08:00. All the user's trips are stored in +08:00 already.
from datetime import timezone as _tz
MYT = _tz(timedelta(hours=8))


# ---------- Rate matrix ----------

@dataclass
class _Bucket:
    nett: float = 0.0
    hours: float = 0.0
    count: int = 0

    @property
    def rate(self) -> float:
        return (self.nett / self.hours) if self.hours > 0 else 0.0


class RateMatrix:
    """Driver's empirical RM/hr, grouped at 4 fallback levels."""

    def __init__(self, trips: Iterable[Trip]):
        self.by_zhp: dict[Tuple[str, int, Platform], _Bucket] = defaultdict(_Bucket)
        self.by_zh: dict[Tuple[str, int], _Bucket] = defaultdict(_Bucket)
        self.by_z: dict[str, _Bucket] = defaultdict(_Bucket)
        self.overall = _Bucket()
        self.trip_count = 0

        for t in trips:
            hrs = t.duration_minutes / 60.0
            if hrs <= 0:
                continue
            nett = max(0.0, t.nett_rm)
            hour = t.start_ts.astimezone(MYT).hour

            self.by_zhp[(t.start_zone, hour, t.platform)].nett += nett
            self.by_zhp[(t.start_zone, hour, t.platform)].hours += hrs
            self.by_zhp[(t.start_zone, hour, t.platform)].count += 1

            self.by_zh[(t.start_zone, hour)].nett += nett
            self.by_zh[(t.start_zone, hour)].hours += hrs
            self.by_zh[(t.start_zone, hour)].count += 1

            self.by_z[t.start_zone].nett += nett
            self.by_z[t.start_zone].hours += hrs
            self.by_z[t.start_zone].count += 1

            self.overall.nett += nett
            self.overall.hours += hrs
            self.overall.count += 1

            self.trip_count += 1

    def lookup(
        self,
        zone: str,
        hour: int,
        platform: Platform,
    ) -> tuple[float, str, str]:
        """Return (rate, source_level, human_note)."""

        bucket = self.by_zhp.get((zone, hour, platform))
        if bucket and bucket.count >= MIN_SAMPLES_FOR_BUCKET:
            return (
                bucket.rate,
                "zone_hour_platform",
                f"{bucket.count} trips in {zone}@{hour:02d}h on {platform.value}",
            )

        bucket = self.by_zh.get((zone, hour))
        if bucket and bucket.count >= MIN_SAMPLES_FOR_BUCKET:
            return (
                bucket.rate,
                "zone_hour",
                f"{bucket.count} trips in {zone}@{hour:02d}h (any platform)",
            )

        bucket = self.by_z.get(zone)
        if bucket and bucket.count >= MIN_SAMPLES_FOR_BUCKET:
            return (
                bucket.rate,
                "zone",
                f"{bucket.count} trips in {zone} (any hour/platform)",
            )

        if self.overall.count >= MIN_SAMPLES_FOR_BUCKET:
            return (
                self.overall.rate,
                "overall",
                f"{self.overall.count}-trip overall average",
            )

        return (
            DEFAULT_RM_PER_HOUR,
            "default",
            "no history - conservative default used",
        )


# ---------- Trip loading (we need a wider window than earnings_service exposes) ----------

def _all_trips_since(driver_id: str, earliest: datetime) -> List[Trip]:
    """Load driver trips from `earliest` up to now.
    list_trips takes days, so we pass a comfortably wide window and
    then filter.
    """

    lookback_days = max(1, (datetime.now(timezone.utc) - earliest).days + 2)
    # Cap: we never need more than a few months.
    lookback_days = min(lookback_days, 180)
    raw = list_trips_days(driver_id=driver_id, days=lookback_days)
    return [t for t in raw if t.start_ts >= earliest]


def _trips_in_window(trips: Iterable[Trip], start: datetime, end: datetime) -> List[Trip]:
    return [t for t in trips if start <= t.start_ts < end]


def _trips_before(trips: Iterable[Trip], before: datetime) -> List[Trip]:
    return [t for t in trips if t.start_ts < before]


# ---------- Core entry point ----------

def run_backtest(
    window: TimeWindow,
    driver_id: str = "local",
) -> BacktestResult:
    """Replay the plan engine against a historical window.

    Args:
        window: the calendar window to backtest. Usually the last 7
            days. Each calendar day in the window is replayed
            independently - one plan per day.
        driver_id: driver to backtest.

    Returns: BacktestResult with per-day breakdown and totals.
    """

    # Load all trips we'll need: rate matrix lookback + the window itself.
    matrix_floor = window.start - timedelta(days=RATE_MATRIX_LOOKBACK_DAYS)
    all_trips = _all_trips_since(driver_id=driver_id, earliest=matrix_floor)

    warnings: List[str] = []
    if not all_trips:
        warnings.append("no_trips_uploaded")

    baseline_trips = _trips_in_window(all_trips, window.start, window.end)
    baseline_nett = round(sum(t.nett_rm for t in baseline_trips), 2)
    baseline_hours = round(sum(t.duration_minutes for t in baseline_trips) / 60.0, 2)
    baseline_rmh = round(baseline_nett / baseline_hours, 2) if baseline_hours > 0 else 0.0

    profile = get_profile(driver_id)

    per_day: List[BacktestDay] = []
    days = list(_dates_in_window(window))

    for d in days:
        day_result = _replay_day(
            day=d,
            all_trips=all_trips,
            profile=profile,
            warnings=warnings,
            driver_baseline_rmh=baseline_rmh,
        )
        per_day.append(day_result)

    projected_full = round(sum(d.projected_nett_full_plan for d in per_day), 2)
    plan_hours_total = round(sum(d.plan_hours for d in per_day), 2)

    # Average plan RM/hr across all days, weighted by plan hours.
    projected_rmh = (
        round(projected_full / plan_hours_total, 2) if plan_hours_total > 0 else 0.0
    )

    # Apples-to-apples: plan's RM/hr applied to what the driver
    # actually worked. This is the credible headline number.
    projected_same_hours = round(projected_rmh * baseline_hours, 2)

    delta_rm = round(projected_same_hours - baseline_nett, 2)
    delta_pct = (
        round(delta_rm / baseline_nett * 100.0, 1) if baseline_nett > 0 else 0.0
    )

    rate_matrix_trip_count = sum(
        1 for t in all_trips if t.start_ts < window.start
    )
    if rate_matrix_trip_count < 5:
        warnings.append("thin_rate_matrix")
    if baseline_hours == 0:
        warnings.append("no_baseline_hours")

    return BacktestResult(
        driver_id=driver_id,
        window=window,
        days_covered=len(days),
        baseline_nett_rm=baseline_nett,
        baseline_trips=len(baseline_trips),
        baseline_hours_online=baseline_hours,
        baseline_rm_per_hour=baseline_rmh,
        projected_rm_per_hour=projected_rmh,
        projected_nett_same_hours=projected_same_hours,
        projected_nett_full_plan=projected_full,
        plan_hours_total=plan_hours_total,
        delta_rm=delta_rm,
        delta_pct=delta_pct,
        per_day=per_day,
        warnings=_dedup(warnings),
        rate_matrix_trip_count=rate_matrix_trip_count,
        rate_matrix_lookback_days=RATE_MATRIX_LOOKBACK_DAYS,
    )


# ---------- Per-day replay ----------

def _replay_day(
    *,
    day: date,
    all_trips: List[Trip],
    profile,
    warnings: List[str],
    driver_baseline_rmh: float,
) -> BacktestDay:
    # Day window in +08:00 local.
    day_start_local = datetime.combine(day, DEFAULT_DAILY_WINDOW[0], tzinfo=MYT)
    day_end_local = datetime.combine(day, DEFAULT_DAILY_WINDOW[1], tzinfo=MYT)
    day_start = day_start_local.astimezone(timezone.utc)
    day_end = day_end_local.astimezone(timezone.utc)

    # Baseline: whatever the driver actually did on that calendar day.
    calendar_start = datetime.combine(day, time(0, 0), tzinfo=MYT).astimezone(timezone.utc)
    calendar_end = calendar_start + timedelta(days=1)
    baseline_trips = _trips_in_window(all_trips, calendar_start, calendar_end)
    baseline_nett = round(sum(t.nett_rm for t in baseline_trips), 2)
    baseline_hours = round(sum(t.duration_minutes for t in baseline_trips) / 60.0, 2)

    # Rate matrix: trips strictly before this calendar day. This is the
    # no-leakage rule.
    history_trips = _trips_before(all_trips, calendar_start)
    rate_matrix = RateMatrix(history_trips)

    # Analytics for the prompt should also use only historical data.
    history_summary = analytics_service.summarise(history_trips, lookback_days=30)

    # Historical signals for THIS day.
    signals = external_data_service.get_daily_signals(day.isoformat())

    try:
        plan: Plan = glm_service.generate_plan(
            profile=profile,
            analytics=history_summary,
            signals=signals,
            window=TimeWindow(start=day_start, end=day_end),
            now=day_start,
        )
    except Exception as exc:
        # Backtest failures should not poison the whole result; we
        # surface them and move on.
        return BacktestDay(
            date=day.isoformat(),
            baseline_nett_rm=baseline_nett,
            baseline_trips=len(baseline_trips),
            baseline_hours=baseline_hours,
            projected_nett_full_plan=0.0,
            projected_nett_same_hours=0.0,
            plan_hours=0.0,
            delta_rm=-baseline_nett,
            slots=[],
            note=f"plan generation failed: {exc}",
        )

    slots: List[BacktestSlotProjection] = []
    projected_full = 0.0
    plan_hours = 0.0
    for w in plan.windows:
        duration_h = max(0.0, (w.end - w.start).total_seconds() / 3600.0)
        hour = w.start.astimezone(MYT).hour
        rate, src, note = rate_matrix.lookup(w.zone, hour, w.platform)
        projected = round(rate * duration_h, 2)
        projected_full += projected
        plan_hours += duration_h
        slots.append(
            BacktestSlotProjection(
                start=w.start,
                end=w.end,
                platform=w.platform,
                zone=w.zone,
                duration_hours=round(duration_h, 2),
                rate_rm_per_hour=round(rate, 2),
                projected_nett_rm=projected,
                rate_source=src,
                rate_source_note=note,
            )
        )

    # Apples-to-apples projection for the DAY: plan RM/hr * baseline hours.
    day_plan_rmh = (projected_full / plan_hours) if plan_hours > 0 else 0.0
    projected_same_hours_day = round(day_plan_rmh * baseline_hours, 2)

    return BacktestDay(
        date=day.isoformat(),
        baseline_nett_rm=baseline_nett,
        baseline_trips=len(baseline_trips),
        baseline_hours=baseline_hours,
        projected_nett_full_plan=round(projected_full, 2),
        projected_nett_same_hours=projected_same_hours_day,
        plan_hours=round(plan_hours, 2),
        delta_rm=round(projected_same_hours_day - baseline_nett, 2),
        slots=slots,
        plan_id=plan.plan_id,
        note=_day_note(plan, rate_matrix),
    )


def _dates_in_window(window: TimeWindow) -> Iterable[date]:
    # Convert to MYT so "days" align to local calendar dates.
    d = window.start.astimezone(MYT).date()
    end = window.end.astimezone(MYT).date()
    while d <= end:
        yield d
        d += timedelta(days=1)


def _day_note(plan: Plan, matrix: RateMatrix) -> str:
    bits: list[str] = []
    if plan.fallback_used:
        bits.append("GLM fallback used")
    if "glm_mock_mode" in plan.warnings:
        bits.append("mock GLM")
    if matrix.trip_count < 10:
        bits.append("thin history")
    return "; ".join(bits)


def _dedup(seq: List[str]) -> List[str]:
    seen: set[str] = set()
    out: List[str] = []
    for s in seq:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out

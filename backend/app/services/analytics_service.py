"""Analytics aggregation service.

Pre-aggregates trip records into compact summaries that fit inside the
GLM's token budget.
"""

from __future__ import annotations

from collections import defaultdict
from typing import List

from app.models import (
    AnalyticsSummary,
    HourStats,
    Platform,
    PlatformStats,
    Trip,
    ZoneStats,
)


def summarise(trips: List[Trip], lookback_days: int = 14) -> AnalyticsSummary:
    if not trips:
        return AnalyticsSummary.empty(lookback_days)

    total_gross = sum(t.gross_rm for t in trips)
    total_nett = sum(t.nett_rm for t in trips)

    return AnalyticsSummary(
        lookback_days=lookback_days,
        trip_count=len(trips),
        total_gross_rm=round(total_gross, 2),
        total_nett_rm=round(total_nett, 2),
        by_platform=_by_platform(trips),
        by_zone=_by_zone(trips),
        by_hour=_by_hour(trips),
        best_platform_per_hour=_best_platform_per_hour(trips),
    )


def _by_platform(trips: List[Trip]) -> List[PlatformStats]:
    buckets: dict[Platform, list[Trip]] = defaultdict(list)
    for t in trips:
        buckets[t.platform].append(t)

    stats: List[PlatformStats] = []
    for platform, rows in buckets.items():
        total_gross = sum(r.gross_rm for r in rows)
        total_nett = sum(r.nett_rm for r in rows)
        total_minutes = sum(r.duration_minutes for r in rows)
        avg_rm_per_hour = (total_nett / total_minutes * 60.0) if total_minutes > 0 else 0.0
        stats.append(
            PlatformStats(
                platform=platform,
                trips=len(rows),
                total_gross_rm=round(total_gross, 2),
                total_nett_rm=round(total_nett, 2),
                avg_nett_per_trip=round(total_nett / max(1, len(rows)), 2),
                avg_rm_per_hour=round(avg_rm_per_hour, 2),
            )
        )
    stats.sort(key=lambda s: s.total_nett_rm, reverse=True)
    return stats


def _by_zone(trips: List[Trip]) -> List[ZoneStats]:
    buckets: dict[str, list[Trip]] = defaultdict(list)
    for t in trips:
        buckets[t.start_zone].append(t)

    stats: List[ZoneStats] = []
    for zone, rows in buckets.items():
        total_nett = sum(r.nett_rm for r in rows)
        stats.append(
            ZoneStats(
                zone=zone,
                trips=len(rows),
                total_nett_rm=round(total_nett, 2),
                avg_nett_per_trip=round(total_nett / max(1, len(rows)), 2),
            )
        )
    stats.sort(key=lambda s: s.total_nett_rm, reverse=True)
    return stats


def _by_hour(trips: List[Trip]) -> List[HourStats]:
    buckets: dict[int, list[Trip]] = defaultdict(list)
    for t in trips:
        buckets[t.start_ts.hour].append(t)

    stats: List[HourStats] = []
    for hour in sorted(buckets.keys()):
        rows = buckets[hour]
        total_nett = sum(r.nett_rm for r in rows)
        stats.append(
            HourStats(
                hour=hour,
                trips=len(rows),
                total_nett_rm=round(total_nett, 2),
                avg_nett_per_trip=round(total_nett / max(1, len(rows)), 2),
            )
        )
    return stats


def _best_platform_per_hour(trips: List[Trip]) -> dict[int, Platform]:
    buckets: dict[tuple[int, Platform], float] = defaultdict(float)
    for t in trips:
        buckets[(t.start_ts.hour, t.platform)] += t.nett_rm

    out: dict[int, Platform] = {}
    per_hour: dict[int, list[tuple[Platform, float]]] = defaultdict(list)
    for (hour, platform), nett in buckets.items():
        per_hour[hour].append((platform, nett))
    for hour, lst in per_hour.items():
        lst.sort(key=lambda x: x[1], reverse=True)
        out[hour] = lst[0][0]
    return out

"""Aggregated analytics over a driver's trip history."""

from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel, Field

from app.models.enums import Platform


class PlatformStats(BaseModel):
    platform: Platform
    trips: int
    total_gross_rm: float
    total_nett_rm: float
    avg_nett_per_trip: float
    avg_rm_per_hour: float


class ZoneStats(BaseModel):
    zone: str
    trips: int
    total_nett_rm: float
    avg_nett_per_trip: float


class HourStats(BaseModel):
    hour: int = Field(ge=0, le=23)
    trips: int
    total_nett_rm: float
    avg_nett_per_trip: float


class AnalyticsSummary(BaseModel):
    """Rolling-window summary of a driver's trips.

    This is what the GLM sees — raw trips never enter the prompt. We
    pre-aggregate here so the token budget stays predictable.
    """

    lookback_days: int
    trip_count: int
    total_gross_rm: float
    total_nett_rm: float
    by_platform: List[PlatformStats] = Field(default_factory=list)
    by_zone: List[ZoneStats] = Field(default_factory=list)
    by_hour: List[HourStats] = Field(default_factory=list)
    best_platform_per_hour: Dict[int, Platform] = Field(default_factory=dict)

    def summary_for_prompt(self, top_n_zones: int = 6, top_n_hours: int = 8) -> dict:
        """Token-efficient view for the GLM prompt.

        Keeps only the top-N zones and hours by nett earnings, plus the
        per-platform totals. Drops everything a recommendation engine
        would not meaningfully read.
        """

        top_zones = sorted(self.by_zone, key=lambda z: z.total_nett_rm, reverse=True)[:top_n_zones]
        top_hours = sorted(self.by_hour, key=lambda h: h.total_nett_rm, reverse=True)[:top_n_hours]
        return {
            "lookback_days": self.lookback_days,
            "trip_count": self.trip_count,
            "total_nett_rm": round(self.total_nett_rm, 2),
            "by_platform": [
                {
                    "platform": p.platform.value,
                    "trips": p.trips,
                    "avg_nett_per_trip": round(p.avg_nett_per_trip, 2),
                    "avg_rm_per_hour": round(p.avg_rm_per_hour, 2),
                }
                for p in self.by_platform
            ],
            "top_zones": [
                {
                    "zone": z.zone,
                    "trips": z.trips,
                    "avg_nett_per_trip": round(z.avg_nett_per_trip, 2),
                }
                for z in top_zones
            ],
            "top_hours": [
                {
                    "hour": h.hour,
                    "trips": h.trips,
                    "avg_nett_per_trip": round(h.avg_nett_per_trip, 2),
                }
                for h in top_hours
            ],
            "best_platform_per_hour": {
                str(hour): platform.value for hour, platform in self.best_platform_per_hour.items()
            },
        }

    @classmethod
    def empty(cls, lookback_days: int = 14) -> "AnalyticsSummary":
        return cls(
            lookback_days=lookback_days,
            trip_count=0,
            total_gross_rm=0.0,
            total_nett_rm=0.0,
        )

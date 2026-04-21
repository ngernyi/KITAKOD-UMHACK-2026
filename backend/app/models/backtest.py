"""Backtest result models.

The backtest answers one question for a historical window:
  "What did you earn, and what would the plan have projected?"

Projections are built from the driver's own empirical RM/hr, never from
made-up multipliers. Each slot records which level of the fallback
chain was used so the number is auditable.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field

from app.models.enums import Platform
from app.models.profile import TimeWindow


RateSource = Literal["zone_hour_platform", "zone_hour", "zone", "overall", "default"]


class BacktestSlotProjection(BaseModel):
    """One plan window replayed against the driver's history."""

    start: datetime
    end: datetime
    platform: Platform
    zone: str
    duration_hours: float = Field(ge=0.0)
    rate_rm_per_hour: float = Field(ge=0.0)
    projected_nett_rm: float = Field(ge=0.0)
    rate_source: RateSource
    rate_source_note: str = ""


class BacktestDay(BaseModel):
    date: str
    baseline_nett_rm: float = Field(ge=0.0)
    baseline_trips: int = Field(ge=0)
    baseline_hours: float = Field(ge=0.0, default=0.0)
    projected_nett_full_plan: float = Field(ge=0.0)
    projected_nett_same_hours: float = Field(ge=0.0, default=0.0)
    plan_hours: float = Field(ge=0.0, default=0.0)
    delta_rm: float
    slots: List[BacktestSlotProjection] = Field(default_factory=list)
    plan_id: str = ""
    note: str = ""


class BacktestResult(BaseModel):
    """Two projections are reported:

    - `projected_nett_same_hours`: the plan's RM/hr applied to the
      hours the driver actually worked. This is the apples-to-apples
      comparison and drives `delta_rm` / `delta_pct`.
    - `projected_nett_full_plan`: the sum of every recommended slot,
      as if the driver had followed the full plan. This is the
      aspirational number - often much larger because it includes
      time the driver did not actually drive.
    """

    driver_id: str = "local"
    window: TimeWindow
    days_covered: int = Field(ge=0)

    baseline_nett_rm: float = Field(ge=0.0)
    baseline_trips: int = Field(ge=0)
    baseline_hours_online: float = Field(ge=0.0)
    baseline_rm_per_hour: float = Field(ge=0.0)

    projected_rm_per_hour: float = Field(ge=0.0)
    projected_nett_same_hours: float = Field(ge=0.0)
    projected_nett_full_plan: float = Field(ge=0.0)
    plan_hours_total: float = Field(ge=0.0)

    delta_rm: float
    delta_pct: float

    per_day: List[BacktestDay] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    rate_matrix_trip_count: int = Field(ge=0, default=0)
    rate_matrix_lookback_days: int = Field(ge=1, default=60)

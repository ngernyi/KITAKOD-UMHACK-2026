"""Pydantic data models for GigShift.

Every cross-service payload is typed. Raw dicts are discouraged past the
HTTP boundary.
"""

from app.models.enums import Platform, VehicleType, FuelType, CrowdSize
from app.models.profile import DriverProfile, TimeWindow
from app.models.trip import Trip, TripUpload
from app.models.signals import WeatherSnapshot, EventSnapshot, DailySignals
from app.models.analytics import (
    PlatformStats,
    ZoneStats,
    HourStats,
    AnalyticsSummary,
)
from app.models.plan import PlanWindow, Plan, FollowupTurn
from app.models.backtest import BacktestDay, BacktestResult

__all__ = [
    "Platform",
    "VehicleType",
    "FuelType",
    "CrowdSize",
    "DriverProfile",
    "TimeWindow",
    "Trip",
    "TripUpload",
    "WeatherSnapshot",
    "EventSnapshot",
    "DailySignals",
    "PlatformStats",
    "ZoneStats",
    "HourStats",
    "AnalyticsSummary",
    "PlanWindow",
    "Plan",
    "FollowupTurn",
    "BacktestDay",
    "BacktestResult",
]

"""Driver profile and time window models."""

from __future__ import annotations

from datetime import datetime, time
from typing import List

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import FuelType, Platform, VehicleType


class TimeWindow(BaseModel):
    """Arbitrary start/end ISO datetime pair."""

    model_config = ConfigDict(json_schema_extra={"example": {
        "start": "2026-04-20T18:00:00+08:00",
        "end": "2026-04-20T23:00:00+08:00",
    }})

    start: datetime
    end: datetime


class TypicalHours(BaseModel):
    """Typical daily driving window in the driver's local time."""

    weekday_start: time = Field(default=time(10, 0))
    weekday_end: time = Field(default=time(22, 0))
    weekend_start: time = Field(default=time(11, 0))
    weekend_end: time = Field(default=time(23, 0))


class DriverProfile(BaseModel):
    driver_id: str = "local"
    display_name: str = "Driver"
    vehicle_type: VehicleType = VehicleType.CAR
    fuel_type: FuelType = FuelType.RON95
    home_zone: str = "petaling_jaya_ss2"
    typical_hours: TypicalHours = Field(default_factory=TypicalHours)
    platforms: List[Platform] = Field(
        default_factory=lambda: [Platform.GRAB, Platform.MAXIM, Platform.AIRASIA, Platform.INDRIVE]
    )
    vehicle_fuel_consumption_l_per_100km: float = Field(default=7.5, ge=0.1, le=30.0)

    def is_default(self) -> bool:
        """Whether this is a stock default profile (no user edits yet)."""

        return self.driver_id == "local" and self.display_name == "Driver"

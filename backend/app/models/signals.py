"""External signal models (weather, events, holidays, fuel)."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.enums import CrowdSize


class WeatherSnapshot(BaseModel):
    condition: str = Field(description="Short label e.g. 'clear', 'light rain', 'thunderstorm'.")
    temperature_c: float
    rain_mm: float = Field(ge=0.0, description="Forecast precipitation over the shift window (mm).")
    wind_kph: float = Field(default=0.0, ge=0.0)
    cloud_cover_pct: Optional[float] = None


class EventSnapshot(BaseModel):
    id: str
    name: str
    venue: str
    zone: str
    secondary_zones: List[str] = Field(default_factory=list)
    start_ts: datetime
    end_ts: datetime
    expected_crowd: CrowdSize
    notes: str = ""


class FuelPrices(BaseModel):
    ron95: float
    ron97: float
    diesel: float
    week_start: str


class HolidaySnapshot(BaseModel):
    date: str
    name: str
    type: str


class DailySignals(BaseModel):
    """All external signals assembled for one shift date."""

    date: str = Field(description="YYYY-MM-DD in Malaysia local time.")
    weather: Optional[WeatherSnapshot] = None
    public_holidays: List[HolidaySnapshot] = Field(default_factory=list)
    school_break: bool = False
    fuel: FuelPrices
    events: List[EventSnapshot] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    generated_at: datetime

    def summary_for_prompt(self) -> dict:
        """Compact, token-efficient view for the GLM prompt."""

        return {
            "date": self.date,
            "weather": (
                None
                if self.weather is None
                else {
                    "condition": self.weather.condition,
                    "temp_c": round(self.weather.temperature_c, 1),
                    "rain_mm": round(self.weather.rain_mm, 1),
                }
            ),
            "is_public_holiday": len(self.public_holidays) > 0,
            "holiday_names": [h.name for h in self.public_holidays],
            "school_break": self.school_break,
            "ron95_rm_per_l": self.fuel.ron95,
            "ron97_rm_per_l": self.fuel.ron97,
            "events": [
                {
                    "name": e.name,
                    "venue": e.venue,
                    "zone": e.zone,
                    "secondary_zones": e.secondary_zones,
                    "start": e.start_ts.isoformat(),
                    "end": e.end_ts.isoformat(),
                    "crowd": e.expected_crowd.value,
                    "notes": e.notes,
                }
                for e in self.events
            ],
            "warnings": self.warnings,
        }

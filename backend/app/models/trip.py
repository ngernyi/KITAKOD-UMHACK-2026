"""Trip record — the canonical normalised earning event."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, computed_field

from app.models.enums import Platform


class Trip(BaseModel):
    """Single completed trip across any platform."""

    id: Optional[int] = None
    driver_id: str = "local"
    platform: Platform
    start_ts: datetime
    end_ts: datetime
    start_zone: str
    end_zone: Optional[str] = None
    distance_km: float = Field(ge=0.0, le=500.0)
    gross_rm: float = Field(ge=0.0)
    commission_rm: float = Field(ge=0.0)
    nett_rm: float = Field(ge=0.0)
    tip_rm: float = Field(default=0.0, ge=0.0)
    surge_multiplier: float = Field(default=1.0, ge=0.5, le=5.0)
    source_upload_id: Optional[int] = None

    @computed_field  # type: ignore[misc]
    @property
    def duration_minutes(self) -> float:
        delta = self.end_ts - self.start_ts
        return max(0.0, delta.total_seconds() / 60.0)

    @computed_field  # type: ignore[misc]
    @property
    def rm_per_hour(self) -> float:
        minutes = self.duration_minutes
        return (self.nett_rm / minutes * 60.0) if minutes > 0 else 0.0


class TripUpload(BaseModel):
    """HTTP payload for bulk trip uploads.

    Either `csv_text` or `rows` may be populated, not both.
    """

    platform: Platform
    csv_text: Optional[str] = None
    rows: Optional[list[dict]] = None
    driver_id: str = "local"

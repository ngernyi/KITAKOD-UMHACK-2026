"""Next Shift Plan and follow-up Q&A models."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.enums import Platform
from app.models.profile import TimeWindow


class PlanWindow(BaseModel):
    """A single time-sliced recommendation inside a Plan."""

    start: datetime
    end: datetime
    platform: Platform
    zone: str
    expected_nett_rm: float = Field(ge=0.0)
    rationale: str = Field(default="", description="One-sentence per-window rationale.")


class Plan(BaseModel):
    """The Next Shift Plan the GLM produces."""

    plan_id: str
    driver_id: str = "local"
    availability_window: TimeWindow
    windows: List[PlanWindow]
    total_expected_nett_rm: float = Field(ge=0.0)
    confidence: int = Field(ge=0, le=100)
    reasoning: str = Field(min_length=10)
    signals_used: List[str] = Field(default_factory=list, min_length=0)
    fallback_used: bool = False
    warnings: List[str] = Field(default_factory=list)
    generated_at: datetime


class FollowupTurn(BaseModel):
    """A single Q&A pair tied to a plan."""

    plan_id: str
    question: str = Field(min_length=1, max_length=500)
    answer: str
    asked_at: datetime
    signals_referenced: List[str] = Field(default_factory=list)

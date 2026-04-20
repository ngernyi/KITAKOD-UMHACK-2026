"""Backtest result models."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class BacktestDay(BaseModel):
    date: str
    actual_nett_rm: float
    if_followed_nett_rm: float
    delta_rm: float
    note: str = ""


class BacktestResult(BaseModel):
    weeks: int = Field(ge=1, le=8)
    actual_total_rm: float
    if_followed_total_rm: float
    delta_rm: float
    delta_pct: float
    per_day: List[BacktestDay] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

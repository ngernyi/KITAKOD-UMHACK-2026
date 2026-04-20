"""Backtest Service (Phase A stub).

Full implementation lands in Phase D. For now, returns an empty result so
the /api/backtest/run route exists end-to-end.
"""

from __future__ import annotations

from app.models import BacktestResult


def run_backtest(weeks: int = 4, driver_id: str = "local") -> BacktestResult:
    return BacktestResult(
        weeks=weeks,
        actual_total_rm=0.0,
        if_followed_total_rm=0.0,
        delta_rm=0.0,
        delta_pct=0.0,
        per_day=[],
        warnings=["backtest_stub_phase_a"],
    )

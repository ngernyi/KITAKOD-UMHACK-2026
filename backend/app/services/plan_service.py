"""Plan Service — orchestrator for the core GLM loop.

This is the single function any HTTP route should call to produce a Plan.
It gathers inputs, calls the GLM service, and persists the result.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Optional

from flask import current_app

from app.db import get_conn
from app.models import Plan
from app.models.profile import TimeWindow
from app.services import analytics_service, earnings_service, external_data_service, glm_service
from app.services.profile_service import get_profile


def generate_plan(window: TimeWindow, driver_id: str = "local") -> Plan:
    profile = get_profile(driver_id)
    trips = earnings_service.list_trips(driver_id=driver_id, days=14)
    analytics = analytics_service.summarise(trips, lookback_days=14)

    signal_date = window.start.date().isoformat()
    signals = external_data_service.get_daily_signals(signal_date)

    plan = glm_service.generate_plan(
        profile=profile,
        analytics=analytics,
        signals=signals,
        window=window,
    )

    _persist_plan(plan)
    return plan


def ask_followup(plan_id: str, question: str) -> dict:
    plan = _load_plan(plan_id)
    if plan is None:
        return {"error": "plan_not_found", "plan_id": plan_id}

    answer = glm_service.ask_followup(plan, question)
    asked_at = datetime.now(timezone.utc).isoformat()
    turn_id = _persist_followup(plan_id, question, answer, asked_at)
    return {
        "id": turn_id,
        "plan_id": plan_id,
        "question": question,
        "answer": answer,
        "asked_at": asked_at,
        "signals_referenced": plan.signals_used,
    }


def list_followups(plan_id: str) -> list[dict]:
    db_path = current_app.config["DB_PATH"]
    with get_conn(db_path) as conn:
        rows = conn.execute(
            """
            SELECT id, question, answer, asked_at
            FROM followups
            WHERE plan_id = ?
            ORDER BY asked_at ASC
            """,
            (plan_id,),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "plan_id": plan_id,
            "question": r["question"],
            "answer": r["answer"],
            "asked_at": r["asked_at"],
        }
        for r in rows
    ]


def _persist_plan(plan: Plan) -> None:
    db_path = current_app.config["DB_PATH"]
    prompt_hash = hashlib.sha256(plan.model_dump_json().encode("utf-8")).hexdigest()[:16]
    with get_conn(db_path) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO plans
                (plan_id, driver_id, window_start, window_end, plan_json, prompt_hash, fallback_used, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                plan.plan_id,
                plan.driver_id,
                plan.availability_window.start.isoformat(),
                plan.availability_window.end.isoformat(),
                plan.model_dump_json(),
                prompt_hash,
                1 if plan.fallback_used else 0,
                plan.generated_at.isoformat(),
            ),
        )


def _load_plan(plan_id: str) -> Optional[Plan]:
    db_path = current_app.config["DB_PATH"]
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT plan_json FROM plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()
        if not row:
            return None
        return Plan.model_validate_json(row["plan_json"])


def _persist_followup(plan_id: str, question: str, answer: str, asked_at: str) -> int:
    db_path = current_app.config["DB_PATH"]
    with get_conn(db_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO followups (plan_id, question, answer, asked_at)
            VALUES (?, ?, ?, ?)
            """,
            (plan_id, question, answer, asked_at),
        )
        return cursor.lastrowid or 0

"""GigShift HTTP routes.

All API endpoints. Each endpoint is a thin wrapper: validate input,
delegate to a service, serialise response. No business logic lives here.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from flask import Blueprint, Response, jsonify, request
from pydantic import ValidationError

from app.models import DriverProfile, Platform
from app.models.profile import TimeWindow
from app.models.trip import TripUpload
from app.services import (
    analytics_service,
    backtest_service,
    earnings_service,
    external_data_service,
    plan_service,
)
from app.services.glm_service import call_glm, call_glm_with_context
from app.services.profile_service import get_profile, upsert_profile

log = logging.getLogger("gigshift.routes")

bp = Blueprint("api", __name__, url_prefix="/api")


# ---------- Health ----------

@bp.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "gigshift",
            "now": datetime.now(timezone.utc).isoformat(),
        }
    )


# ---------- Profile ----------

@bp.route("/profile", methods=["GET"])
def get_profile_route():
    driver_id = request.args.get("driver_id", "local")
    return jsonify(get_profile(driver_id).model_dump(mode="json"))


@bp.route("/profile", methods=["PUT"])
def put_profile_route():
    data = request.get_json(silent=True) or {}
    try:
        profile = DriverProfile.model_validate(data)
    except ValidationError as exc:
        return jsonify({"error": "validation_error", "details": exc.errors()}), 400
    upsert_profile(profile)
    return jsonify({"ok": True, "driver_id": profile.driver_id})


# ---------- Earnings ----------

@bp.route("/earnings/upload", methods=["POST"])
def upload_earnings():
    data = request.get_json(silent=True) or {}
    try:
        upload = TripUpload.model_validate(data)
    except ValidationError as exc:
        return jsonify({"error": "validation_error", "details": exc.errors()}), 400
    try:
        result = earnings_service.ingest(upload)
    except Exception as exc:
        log.exception("earnings.ingest failed")
        return jsonify({"error": "ingest_failed", "detail": str(exc)}), 500
    return jsonify(result.to_dict())


@bp.route("/earnings/template", methods=["GET"])
def earnings_template():
    platform_raw = request.args.get("platform", "grab")
    try:
        platform = Platform(platform_raw)
    except ValueError:
        return jsonify({"error": "bad_platform"}), 400
    csv_text = earnings_service.csv_template(platform)
    filename = f"gigshift_earnings_template_{platform.value}.csv"
    return Response(
        csv_text,
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@bp.route("/earnings/totals", methods=["GET"])
def earnings_totals():
    driver_id = request.args.get("driver_id", "local")
    try:
        days = int(request.args.get("days", "14"))
    except ValueError:
        return jsonify({"error": "bad_days_param"}), 400
    return jsonify(earnings_service.totals(driver_id=driver_id, days=days))


@bp.route("/analytics/summary", methods=["GET"])
def analytics_summary():
    try:
        days = int(request.args.get("days", "14"))
    except ValueError:
        return jsonify({"error": "bad_days_param"}), 400
    driver_id = request.args.get("driver_id", "local")
    trips = earnings_service.list_trips(driver_id=driver_id, days=days)
    summary = analytics_service.summarise(trips, lookback_days=days)
    return jsonify(summary.model_dump(mode="json"))


# ---------- External data ----------

@bp.route("/external/today", methods=["GET"])
def external_today():
    date_iso = request.args.get("date") or datetime.now(timezone.utc).date().isoformat()
    signals = external_data_service.get_daily_signals(date_iso)
    return jsonify(signals.model_dump(mode="json"))


# ---------- Plan ----------

@bp.route("/plan/generate", methods=["POST"])
def generate_plan_route():
    data = request.get_json(silent=True) or {}
    try:
        window = TimeWindow.model_validate(data.get("window", {}))
    except ValidationError as exc:
        return jsonify({"error": "validation_error", "details": exc.errors()}), 400
    if window.end <= window.start:
        return jsonify({"error": "window_end_must_be_after_start"}), 400
    driver_id = data.get("driver_id", "local")
    try:
        plan = plan_service.generate_plan(window, driver_id=driver_id)
    except Exception as exc:
        log.exception("plan.generate_plan failed")
        return jsonify({"error": "plan_generation_failed", "detail": str(exc)}), 500
    return jsonify(plan.model_dump(mode="json"))


@bp.route("/plan/ask", methods=["POST"])
def ask_followup_route():
    data = request.get_json(silent=True) or {}
    plan_id = data.get("plan_id")
    question = (data.get("question") or "").strip()
    if not plan_id or not question:
        return jsonify({"error": "missing_plan_id_or_question"}), 400
    if len(question) > 500:
        return jsonify({"error": "question_too_long"}), 400
    result = plan_service.ask_followup(plan_id, question)
    if "error" in result:
        return jsonify(result), 404
    return jsonify(result)


@bp.route("/plan/<plan_id>/followups", methods=["GET"])
def list_followups_route(plan_id: str):
    turns = plan_service.list_followups(plan_id)
    return jsonify({"plan_id": plan_id, "followups": turns})


# ---------- Backtest ----------

@bp.route("/backtest/run", methods=["POST"])
def backtest_route():
    data = request.get_json(silent=True) or {}
    window_raw = data.get("window") or {}
    try:
        window = TimeWindow.model_validate(window_raw)
    except ValidationError as exc:
        return jsonify({"error": "validation_error", "details": exc.errors()}), 400

    # Guard: backtest windows longer than 31 days get expensive (one
    # GLM call per day). Cap it.
    span_days = (window.end - window.start).days
    if span_days > 31:
        return jsonify({"error": "window_too_long", "max_days": 31}), 400

    driver_id = data.get("driver_id", "local")
    try:
        result = backtest_service.run_backtest(window=window, driver_id=driver_id)
    except Exception as exc:
        log.exception("backtest failed")
        return jsonify({"error": "backtest_failed", "detail": str(exc)}), 500
    return jsonify(result.model_dump(mode="json"))


# ---------- Debug (kept from template) ----------

@bp.route("/glm/predict", methods=["POST"])
def glm_predict_debug():
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt")
    if not prompt:
        return jsonify({"error": "missing_prompt"}), 400
    try:
        return jsonify({"success": True, "result": call_glm(prompt)})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.route("/glm/analyze", methods=["POST"])
def glm_analyze_debug():
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt")
    if not prompt:
        return jsonify({"error": "missing_prompt"}), 400
    try:
        return jsonify({
            "success": True,
            "result": call_glm_with_context(
                prompt,
                context=data.get("context", []),
                system_prompt=data.get("system_prompt", ""),
            ),
        })
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# Unused imports used for type checking / future wiring.
_ = Platform

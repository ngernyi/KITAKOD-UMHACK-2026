"""Z.AI GLM Service.

This module is the *only* place in the codebase that constructs GLM
prompts and speaks to the Z.AI API. Every other service goes through
`generate_plan()` or `ask_followup()`.

Mock-mode:
- When `ZAI_API_KEY` is absent, `generate_plan()` returns a deterministic
  plan-shaped JSON so the entire pipeline is demoable end-to-end. This is
  a first-class tested path (QATD TC-110), not a dev shortcut.
"""

from __future__ import annotations

import hashlib
import json
import logging
import random
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import requests
from flask import current_app

from app.models import (
    AnalyticsSummary,
    DailySignals,
    DriverProfile,
    Plan,
    PlanWindow,
    Platform,
)
from app.models.profile import TimeWindow
from app.services.external_data_service import zone_whitelist
from app.services.prompts import (
    build_followup_system_prompt,
    build_followup_user_prompt,
    build_plan_system_prompt,
    build_plan_user_prompt,
)

log = logging.getLogger("gigshift.glm")

MAX_RETRIES = 1
DEFAULT_TEMPERATURE = 0.4
DEFAULT_MAX_TOKENS = 1200


class GlmError(RuntimeError):
    """Raised when the GLM call fails or returns unusable output."""


def _get_config() -> dict:
    return {
        "api_key": current_app.config.get("ZAI_API_KEY"),
        "api_url": current_app.config.get("ZAI_API_URL"),
    }


def _prompt_hash(*parts: str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8"))
    return h.hexdigest()[:16]


def _post_chat(messages: list[dict], temperature: float, max_tokens: int) -> dict:
    cfg = _get_config()
    if not cfg["api_key"]:
        raise GlmError("no_api_key")
    headers = {
        "Authorization": f"Bearer {cfg['api_key']}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "glm-4.5",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    resp = requests.post(
        f"{cfg['api_url']}/chat/completions",
        headers=headers,
        json=payload,
        timeout=current_app.config.get("PLAN_TIMEOUT_SECONDS", 30),
    )
    if resp.status_code != 200:
        raise GlmError(f"http_{resp.status_code}: {resp.text[:200]}")
    return resp.json()


def _extract_assistant_text(response: dict) -> str:
    """Tolerates a couple of response shapes. Z.AI currently follows the
    OpenAI-style `choices[0].message.content`.
    """

    try:
        return response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        pass
    if isinstance(response.get("response"), str):
        return response["response"]
    if isinstance(response.get("text"), str):
        return response["text"]
    raise GlmError("unrecognised_response_shape")


def _parse_json_object(text: str) -> dict:
    """Extract a JSON object from a raw model response.

    Strategy:
    1. Strict json.loads first.
    2. Strip markdown fences (```json ... ```).
    3. Regex for the outermost {...} block.
    """

    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except json.JSONDecodeError:
        pass

    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
    if fence:
        try:
            return json.loads(fence.group(1))
        except json.JSONDecodeError:
            pass

    brace = re.search(r"\{.*\}", text, re.DOTALL)
    if brace:
        try:
            return json.loads(brace.group(0))
        except json.JSONDecodeError:
            pass

    raise GlmError("json_parse_failed")


# ---------- Plan generation ----------

def generate_plan(
    *,
    profile: DriverProfile,
    analytics: AnalyticsSummary,
    signals: DailySignals,
    window: TimeWindow,
    now: Optional[datetime] = None,
) -> Plan:
    """Produce a Plan using the GLM (or a deterministic mock when no key).

    Always returns a schema-valid `Plan`. If the model fails twice or the
    JSON is unusable, sets `fallback_used=True` and returns a plan derived
    from analytics alone.
    """

    now = now or datetime.now(timezone.utc)
    zones = zone_whitelist()
    system = build_plan_system_prompt(zones)
    user = build_plan_user_prompt(profile, analytics, signals, window, now)
    prompt_hash = _prompt_hash(system, user)

    cfg = _get_config()
    if not cfg["api_key"]:
        log.info("glm.generate_plan mock_mode prompt_hash=%s", prompt_hash)
        plan = _mock_plan(profile, analytics, signals, window, now)
        plan.warnings.append("glm_mock_mode")
        return plan

    try:
        response = _call_with_retry(system, user)
        raw_text = _extract_assistant_text(response)
        obj = _parse_json_object(raw_text)
        return _plan_from_model_json(obj, profile, window, now, fallback_used=False)
    except GlmError as exc:
        log.warning("glm.generate_plan fallback reason=%s hash=%s", exc, prompt_hash)
        plan = _fallback_plan(analytics, window, now, reason=str(exc))
        return plan


def _call_with_retry(system: str, user: str) -> dict:
    last_err: Optional[Exception] = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ]
            if attempt > 0:
                messages.append({
                    "role": "system",
                    "content": (
                        "Your previous response was not valid JSON or missed required keys. "
                        "Return ONLY a single JSON object matching the schema. No prose."
                    ),
                })
            return _post_chat(messages, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS)
        except (GlmError, requests.exceptions.RequestException) as exc:
            last_err = exc
    raise GlmError(f"retries_exhausted: {last_err}")


# ---------- Follow-up Q&A ----------

def ask_followup(plan: Plan, question: str) -> str:
    system = build_followup_system_prompt()
    user = build_followup_user_prompt(plan, question)
    cfg = _get_config()
    if not cfg["api_key"]:
        return _mock_followup(plan, question)

    try:
        resp = _post_chat(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
            max_tokens=350,
        )
        return _extract_assistant_text(resp).strip()
    except (GlmError, requests.exceptions.RequestException) as exc:
        log.warning("glm.ask_followup failed reason=%s", exc)
        return (
            "Sorry, I couldn't reach the reasoning engine just now. "
            f"Based on the plan, your highest-expected slot is "
            f"{plan.windows[0].platform.value if plan.windows else 'n/a'} "
            f"at {plan.windows[0].zone if plan.windows else 'n/a'}."
        )


# ---------- Mocks and fallbacks ----------

def _mock_plan(
    profile: DriverProfile,
    analytics: AnalyticsSummary,
    signals: DailySignals,
    window: TimeWindow,
    now: datetime,
) -> Plan:
    """Deterministic, signal-aware mock that produces realistic plans.

    Uses availability window + signals + analytics to pick zones. Designed
    to look plausible in demo and to stress-test the downstream UI.
    """

    duration_h = max(1.0, (window.end - window.start).total_seconds() / 3600.0)
    slice_count = 1 if duration_h < 2.5 else (2 if duration_h < 5 else 3)

    candidate_zones = [z["id"] for z in zone_whitelist()]
    event_zones = [e.zone for e in signals.events] + [
        z for e in signals.events for z in e.secondary_zones
    ]
    top_history_zones = [z.zone for z in analytics.by_zone[:3]] if analytics.by_zone else []

    zone_pool = _dedupe_keep_order(event_zones + top_history_zones + candidate_zones)
    zone_pool = [z for z in zone_pool if z in candidate_zones]

    platforms = profile.platforms or [Platform.GRAB, Platform.MAXIM]
    windows: list[PlanWindow] = []
    slice_len = (window.end - window.start) / slice_count
    rng = random.Random(int(window.start.timestamp()) ^ hash(profile.driver_id))

    for i in range(slice_count):
        w_start = window.start + slice_len * i
        w_end = window.end if i == slice_count - 1 else window.start + slice_len * (i + 1)
        zone = zone_pool[i % max(1, len(zone_pool))]
        platform = platforms[i % len(platforms)]
        base_rm_per_h = 25.0 if signals.weather and signals.weather.rain_mm > 3 else 32.0
        event_boost = 8.0 if zone in event_zones else 0.0
        expected = round((w_end - w_start).total_seconds() / 3600.0 * (base_rm_per_h + event_boost) + rng.uniform(-3, 3), 2)
        rationale = _mock_rationale(zone, platform, signals, i == 0)
        windows.append(
            PlanWindow(
                start=w_start,
                end=w_end,
                platform=platform,
                zone=zone,
                expected_nett_rm=max(0.0, expected),
                rationale=rationale,
            )
        )

    total = round(sum(w.expected_nett_rm for w in windows), 2)
    confidence = 72 if signals.events else 66
    if signals.weather and signals.weather.rain_mm > 5:
        confidence -= 10

    reasoning = _mock_reasoning(signals, analytics, profile)
    signals_used = _mock_signals_used(signals, analytics, profile)

    return Plan(
        plan_id=str(uuid.uuid4()),
        driver_id=profile.driver_id,
        availability_window=window,
        windows=windows,
        total_expected_nett_rm=total,
        confidence=max(0, min(100, confidence)),
        reasoning=reasoning,
        signals_used=signals_used,
        fallback_used=False,
        warnings=[],
        generated_at=now,
    )


def _mock_rationale(zone: str, platform: Platform, signals: DailySignals, is_first: bool) -> str:
    event_here = [e for e in signals.events if zone in ([e.zone] + e.secondary_zones)]
    if event_here:
        e = event_here[0]
        return (
            f"{platform.value.title()} in {zone}: '{e.name}' at {e.venue} drives demand "
            f"({e.expected_crowd.value} crowd)."
        )
    if signals.weather and signals.weather.rain_mm > 3:
        return (
            f"{platform.value.title()} in {zone}: light-rain window tends to lift short-trip demand; "
            f"sheltered pickup points favoured."
        )
    if is_first:
        return (
            f"{platform.value.title()} in {zone}: historical early-window strength; "
            f"lower platform competition at this hour."
        )
    return (
        f"{platform.value.title()} in {zone}: evening dining cluster; higher surge likelihood."
    )


def _mock_reasoning(signals: DailySignals, analytics: AnalyticsSummary, profile: DriverProfile) -> str:
    parts: list[str] = []
    if signals.events:
        parts.append(
            f"Today has {len(signals.events)} notable KL event(s); post-dispersal demand is factored in."
        )
    if signals.weather:
        parts.append(
            f"Weather: {signals.weather.condition} with {signals.weather.rain_mm:.1f} mm rain expected."
        )
    if analytics.by_zone:
        top = analytics.by_zone[0]
        parts.append(
            f"Your strongest recent zone is {top.zone} (avg RM {top.avg_nett_per_trip:.1f} / trip)."
        )
    parts.append(
        f"Plan favours your usual platforms: {', '.join(p.value for p in profile.platforms[:2])}."
    )
    if profile.preferences:
        snippet = profile.preferences.strip().replace("\n", " ")
        if len(snippet) > 80:
            snippet = snippet[:77] + "..."
        parts.append(f'Respecting your preferences: "{snippet}".')
    return " ".join(parts)


def _mock_signals_used(
    signals: DailySignals,
    analytics: AnalyticsSummary,
    profile: Optional[DriverProfile] = None,
) -> list[str]:
    used: list[str] = []
    if signals.weather:
        used.append(f"weather:{signals.weather.condition.replace(' ', '_')}")
    if signals.public_holidays:
        used.append("holiday")
    if signals.school_break:
        used.append("school_break")
    used.append(f"fuel:ron95_rm_{signals.fuel.ron95:.2f}")
    for e in signals.events[:3]:
        used.append(f"event:{e.id}")
    if analytics.by_zone:
        used.append(f"history:top_zone_{analytics.by_zone[0].zone}")
    if analytics.by_hour:
        used.append(f"history:hourly_peaks")
    if profile and profile.preferences:
        used.append("preferences:driver_freetext")
    return used


def _plan_from_model_json(
    obj: dict,
    profile: DriverProfile,
    window: TimeWindow,
    now: datetime,
    fallback_used: bool,
) -> Plan:
    """Validate a model-returned dict against the Plan schema.

    Raises GlmError on validation failure so the caller can trigger a
    fallback. We intentionally do not fall back silently here.
    """

    try:
        valid_zones = {z["id"] for z in zone_whitelist()}
        windows_raw = obj.get("windows") or []
        windows: list[PlanWindow] = []
        for w in windows_raw:
            if w.get("zone") not in valid_zones:
                raise GlmError(f"zone_not_in_whitelist: {w.get('zone')}")
            windows.append(
                PlanWindow(
                    start=_as_dt(w["start"]),
                    end=_as_dt(w["end"]),
                    platform=Platform(w["platform"]),
                    zone=w["zone"],
                    expected_nett_rm=float(w.get("expected_nett_rm", 0.0)),
                    rationale=str(w.get("rationale", "")).strip()[:300],
                )
            )
        if not windows:
            raise GlmError("no_windows_in_response")

        plan = Plan(
            plan_id=str(uuid.uuid4()),
            driver_id=profile.driver_id,
            availability_window=window,
            windows=windows,
            total_expected_nett_rm=float(obj.get("total_expected_nett_rm", sum(w.expected_nett_rm for w in windows))),
            confidence=int(obj.get("confidence", 65)),
            reasoning=str(obj.get("reasoning", "")).strip() or "No reasoning provided.",
            signals_used=[str(s) for s in (obj.get("signals_used") or [])],
            fallback_used=fallback_used,
            warnings=[],
            generated_at=now,
        )
        return plan
    except (KeyError, ValueError, TypeError) as exc:
        raise GlmError(f"schema_validation_failed: {exc}") from exc


def _as_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    from dateutil import parser as dateparser  # local import; cheap
    return dateparser.isoparse(str(value))


def _fallback_plan(analytics: AnalyticsSummary, window: TimeWindow, now: datetime, reason: str) -> Plan:
    """Deterministic fallback derived from analytics only. Used when the
    GLM fails twice. Clearly labelled so the UI can show a "using
    historical averages" badge.
    """

    zone = (
        analytics.by_zone[0].zone
        if analytics.by_zone
        else "mid_valley"
    )
    platform = (
        analytics.by_platform[0].platform
        if analytics.by_platform
        else Platform.GRAB
    )
    duration_h = max(1.0, (window.end - window.start).total_seconds() / 3600.0)
    rate = (
        analytics.by_platform[0].avg_rm_per_hour
        if analytics.by_platform and analytics.by_platform[0].avg_rm_per_hour > 0
        else 25.0
    )
    expected = round(duration_h * rate, 2)

    return Plan(
        plan_id=str(uuid.uuid4()),
        availability_window=window,
        windows=[
            PlanWindow(
                start=window.start,
                end=window.end,
                platform=platform,
                zone=zone,
                expected_nett_rm=expected,
                rationale="Fallback: using your historical best zone + platform for the window.",
            )
        ],
        total_expected_nett_rm=expected,
        confidence=45,
        reasoning=(
            "Showing a historical-average recommendation. The AI reasoning engine did not return a "
            "usable response this time, so this plan is based purely on your past earnings. "
            f"(reason: {reason})"
        ),
        signals_used=["history:fallback_averages"],
        fallback_used=True,
        warnings=["glm_fallback_used"],
        generated_at=now,
    )


_INTENT_PATTERNS = [
    ("why", r"\bwhy\b|\breason\b|\brationale\b|\bexplain\b"),
    ("confidence", r"\bconfiden(?:t|ce)\b|\bhow sure\b|\bcertain\b|\btrust\b"),
    ("weather", r"\bweather\b|\brain\b|\bthunder\b|\bstorm\b|\bhot\b|\bcloud\b"),
    ("fuel", r"\bfuel\b|\bpetrol\b|\bdiesel\b|\bron\b|\bcost\b"),
    ("safety", r"\bsafe\b|\brisk\b|\bdanger\b|\bavoid\b|\bwarning\b"),
    ("compare_zone", r"\b(why not|instead of|rather than|compared to|vs\.?|over)\b.*\b[a-z]+\b"),
    ("when", r"\bwhen\b|\bwhat time\b|\bwhich hour\b"),
    ("platform", r"\bgrab\b|\bmaxim\b|\bairasia\b|\bindrive\b|\bwhich app\b|\bwhich platform\b"),
    ("zone", r"\bzone\b|\barea\b|\bwhere\b|\bklcc\b|\bbangsar\b|\bpj\b|\bmid valley\b|\bkl sentral\b"),
    ("earnings", r"\bearn\b|\bmoney\b|\bincome\b|\bhow much\b|\brm\b|\bprofit\b"),
]


def _detect_intent(question: str) -> str:
    q = question.lower()
    for label, pattern in _INTENT_PATTERNS:
        if re.search(pattern, q):
            return label
    return "general"


def _mock_followup(plan: Plan, question: str) -> str:
    """Intent-aware mock that reasons from the plan's actual data.
    Never fabricates signals the plan didn't use."""

    if not plan.windows:
        return "The plan has no recommended windows yet, so I can't reason about it."

    first = plan.windows[0]
    best = max(plan.windows, key=lambda w: w.expected_nett_rm)
    total = sum(w.expected_nett_rm for w in plan.windows)
    signals = plan.signals_used or []

    def zone_pretty(zone: str) -> str:
        return zone.replace("_", " ").title()

    intent = _detect_intent(question)

    mock_tag = " (Mock reasoning — no Z.AI key configured.)"

    if intent == "why":
        rationales = [w.rationale for w in plan.windows if w.rationale][:2]
        rationale_text = " ".join(rationales) if rationales else "No per-window rationale was produced."
        return (
            f"The plan's overall reasoning: {plan.reasoning} "
            f"Per-window: {rationale_text}"
            + mock_tag
        )

    if intent == "confidence":
        drivers = [s for s in signals if s.startswith(("history:", "weather:", "event:"))][:3]
        explained = ", ".join(drivers) if drivers else "limited signals"
        return (
            f"Confidence is {plan.confidence}/100. The main drivers are: {explained}. "
            f"Lower confidence usually means sparse history for the recommended slots."
            + mock_tag
        )

    if intent == "weather":
        weather_signals = [s for s in signals if s.startswith("weather:")]
        if weather_signals:
            tag = weather_signals[0].split(":", 1)[1].replace("_", " ")
            return (
                f"Weather today is {tag}. That's why the plan biases toward covered pickup zones "
                f"(malls, transit hubs) and platforms where your historical rain-day earnings held up."
                + mock_tag
            )
        return "Weather signals aren't in the plan's used_signals list." + mock_tag

    if intent == "fuel":
        fuel_signals = [s for s in signals if s.startswith("fuel:")]
        if fuel_signals:
            return (
                f"Fuel signal used: {fuel_signals[0]}. The plan tilts toward shorter trips and "
                f"high RM-per-km zones when fuel is expensive — net, not gross, is what matters."
                + mock_tag
            )
        return "Fuel wasn't a deciding factor in this plan." + mock_tag

    if intent == "safety":
        warnings = plan.warnings or []
        if warnings:
            return f"Flagged warnings: {', '.join(warnings)}. Inspect them before acting." + mock_tag
        return (
            "No safety warnings on this plan. Still, always respect your own fatigue and local advisories."
            + mock_tag
        )

    if intent == "compare_zone":
        return (
            f"The plan ranks {zone_pretty(best.zone)} at {best.start.strftime('%H:%M')} on "
            f"{best.platform.value} as the highest-expected slot ({best.expected_nett_rm:.0f} RM). "
            f"Zones NOT in the plan are either outside the whitelist or scored worse on the "
            f"signals ({', '.join(signals[:3]) or 'n/a'})."
            + mock_tag
        )

    if intent == "when":
        times = [f"{w.start.strftime('%H:%M')}–{w.end.strftime('%H:%M')}" for w in plan.windows]
        return (
            f"Recommended slots: {', '.join(times)}. Peak expected earnings in "
            f"{best.start.strftime('%H:%M')}–{best.end.strftime('%H:%M')} "
            f"({best.expected_nett_rm:.0f} RM)."
            + mock_tag
        )

    if intent == "platform":
        platform_counts: dict[str, int] = {}
        for w in plan.windows:
            platform_counts[w.platform.value] = platform_counts.get(w.platform.value, 0) + 1
        picks = ", ".join(f"{k} ({v})" for k, v in platform_counts.items())
        return (
            f"Platforms in this plan: {picks}. Selection is driven by your best_platform_per_hour "
            f"history — the app with the highest per-hour nett at that hour wins."
            + mock_tag
        )

    if intent == "zone":
        zones = ", ".join({zone_pretty(w.zone) for w in plan.windows})
        return (
            f"Recommended zones: {zones}. All are in the Klang Valley whitelist; the plan will never "
            f"suggest a zone outside it (hard rule in the prompt)."
            + mock_tag
        )

    if intent == "earnings":
        return (
            f"Projected total nett for the full plan: {total:.0f} RM across {len(plan.windows)} slots. "
            f"Best single slot: {zone_pretty(best.zone)} at {best.start.strftime('%H:%M')} "
            f"({best.expected_nett_rm:.0f} RM on {best.platform.value})."
            + mock_tag
        )

    # general fallback
    return (
        f"Short answer based on your plan: first slot is {zone_pretty(first.zone)} "
        f"at {first.start.strftime('%H:%M')} on {first.platform.value}. "
        f"Signals driving the plan: {', '.join(signals[:4]) or 'none recorded'}. "
        f"Ask me something more specific (why / when / which platform / earnings / weather / fuel / safety)."
        + mock_tag
    )


def _dedupe_keep_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for i in items:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out


# Kept for backward compat with the template / debug endpoints:


def call_glm(prompt: str, temperature: float = 0.7, max_tokens: int = 1000) -> dict:
    cfg = _get_config()
    if not cfg["api_key"]:
        return {"mock": True, "response": f"Mock response for: {prompt[:80]}"}
    return _post_chat(
        [{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )


def call_glm_with_context(
    prompt: str,
    context: Optional[list[dict]] = None,
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 1000,
) -> dict:
    cfg = _get_config()
    if not cfg["api_key"]:
        return {"mock": True, "response": f"Mock response for: {prompt[:80]}"}
    messages: list[dict] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if context:
        messages.extend(context)
    messages.append({"role": "user", "content": prompt})
    return _post_chat(messages, temperature=temperature, max_tokens=max_tokens)


def parse_json_response(text: str) -> dict:
    return _parse_json_object(text)

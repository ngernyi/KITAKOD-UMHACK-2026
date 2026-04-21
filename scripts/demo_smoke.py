"""End-to-end smoke test for the GigShift demo.

What it does:
    Hits every public API in sequence against a running backend
    (http://localhost:5000 by default) and asserts each response
    looks structurally sound. Prints a coloured PASS/FAIL report.

What it does NOT do:
    Seed data. Run `python -m scripts.seed_demo_data` from
    backend/ first if you want realistic numbers in the backtest.

Why it's useful:
    Before a demo, running this script is a 5-second sanity check
    that the backend is alive, all endpoints respond with the
    expected shape, the GLM path works (mock or live), follow-ups
    persist, and backtest produces non-trivial output. If anything
    is red, fix it before the judges arrive.

Usage (from repo root):
    python scripts/demo_smoke.py
    python scripts/demo_smoke.py --base http://localhost:5000
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import requests

# Colour handling:
#   Most Unix terminals, modern PowerShell, and VS Code/Cursor terminals
#   accept ANSI escapes. Older cmd.exe does not. Try to enable Windows
#   virtual-terminal processing; if anything fails or NO_COLOR is set,
#   degrade to plain text.
def _enable_colors() -> bool:
    if os.environ.get("NO_COLOR") or not sys.stdout.isatty():
        return False
    if os.name != "nt":
        return True
    try:
        # Python 3.x on Win10+ supports VT via this magic call.
        os.system("")
        return True
    except Exception:
        return False


_COLORS = _enable_colors()


def _c(code: str) -> str:
    return code if _COLORS else ""


GREEN = _c("\033[32m")
RED   = _c("\033[31m")
YELLOW = _c("\033[33m")
CYAN  = _c("\033[36m")
DIM   = _c("\033[2m")
RESET = _c("\033[0m")


class Reporter:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.passes = 0

    def section(self, title: str) -> None:
        print(f"\n{CYAN}== {title} =={RESET}")

    def step(self, name: str, fn: Callable[[], Any]) -> Any:
        t0 = time.monotonic()
        try:
            result = fn()
            dt_ms = int((time.monotonic() - t0) * 1000)
            print(f"  {GREEN}PASS{RESET}  {name}  {DIM}({dt_ms} ms){RESET}")
            self.passes += 1
            return result
        except AssertionError as exc:
            dt_ms = int((time.monotonic() - t0) * 1000)
            print(f"  {RED}FAIL{RESET}  {name}  {DIM}({dt_ms} ms){RESET}")
            print(f"        {RED}{exc}{RESET}")
            self.failures.append(f"{name}: {exc}")
            return None
        except requests.RequestException as exc:
            dt_ms = int((time.monotonic() - t0) * 1000)
            print(f"  {RED}FAIL{RESET}  {name}  {DIM}({dt_ms} ms){RESET}")
            print(f"        {RED}network: {exc}{RESET}")
            self.failures.append(f"{name}: {exc}")
            return None

    def summary(self) -> int:
        total = self.passes + len(self.failures)
        print()
        if not self.failures:
            print(f"{GREEN}All {total} checks passed.{RESET}")
            return 0
        print(f"{RED}{len(self.failures)} of {total} checks failed:{RESET}")
        for f in self.failures:
            print(f"  {RED}*{RESET} {f}")
        return 1


def _assert_keys(obj: dict, keys: list[str], context: str) -> None:
    missing = [k for k in keys if k not in obj]
    assert not missing, f"{context} missing keys: {missing}. Got keys: {list(obj.keys())}"


def _fmt_preview(obj: Any, limit: int = 120) -> str:
    s = json.dumps(obj, ensure_ascii=False) if not isinstance(obj, str) else obj
    return s[:limit] + ("..." if len(s) > limit else "")


def run(base_url: str) -> int:
    r = Reporter()
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})

    def get(path: str, **kwargs) -> requests.Response:
        resp = session.get(f"{base_url}{path}", timeout=15, **kwargs)
        assert resp.status_code == 200, f"GET {path} -> {resp.status_code}: {resp.text[:200]}"
        return resp

    def post(path: str, body: dict, **kwargs) -> requests.Response:
        resp = session.post(f"{base_url}{path}", json=body, timeout=30, **kwargs)
        assert resp.status_code == 200, f"POST {path} -> {resp.status_code}: {resp.text[:200]}"
        return resp

    r.section("Health & environment")

    def _health():
        data = get("/api/health").json()
        _assert_keys(data, ["status", "service", "now"], "/api/health")
        assert data["status"] == "ok"
        return data

    r.step("GET /api/health", _health)

    r.section("External signals (today + tomorrow)")

    def _signals_today():
        data = get("/api/external/today").json()
        _assert_keys(data, ["date", "fuel", "events", "public_holidays", "generated_at"], "/api/external/today")
        return data

    signals = r.step("GET /api/external/today", _signals_today)

    def _signals_tomorrow():
        d = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        data = get(f"/api/external/today?date={d}").json()
        assert data["date"] == d, f"echoed date wrong: {data['date']}"
        return data

    r.step("GET /api/external/today?date=<tomorrow>", _signals_tomorrow)

    r.section("Profile")

    def _get_profile():
        data = get("/api/profile").json()
        _assert_keys(data, ["driver_id", "home_zone", "platforms", "preferences"], "/api/profile")
        return data

    profile = r.step("GET /api/profile", _get_profile)

    def _save_profile():
        payload = dict(profile or {})
        payload["preferences"] = "Avoid KLIA after 22:00, prefer short trips around Bangsar/PJ."
        data = session.put(f"{base_url}/api/profile", json=payload, timeout=15).json()
        assert data.get("preferences", "").startswith("Avoid KLIA"), f"preferences not persisted: {_fmt_preview(data)}"
        return data

    r.step("PUT /api/profile (with preferences)", _save_profile)

    r.section("Earnings")

    def _earnings_totals():
        data = get("/api/earnings/totals?days=14").json()
        _assert_keys(data, ["total_gross_rm", "total_nett_rm", "trip_count", "days"], "/api/earnings/totals")
        return data

    totals = r.step("GET /api/earnings/totals?days=14", _earnings_totals)

    def _template():
        resp = get("/api/earnings/template?platform=grab")
        text = resp.text
        assert "," in text and "\n" in text, "template does not look like CSV"
        return text

    r.step("GET /api/earnings/template?platform=grab", _template)

    r.section("Analytics")

    def _analytics():
        data = get("/api/analytics/summary?days=14").json()
        _assert_keys(
            data,
            ["trip_count", "total_gross_rm", "total_nett_rm", "by_platform", "by_zone", "by_hour"],
            "/api/analytics/summary",
        )
        return data

    analytics = r.step("GET /api/analytics/summary?days=14", _analytics)

    r.section("Plan generation & follow-up Q&A")

    def _generate_plan():
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        body = {
            "driver_id": "local",
            "window": {
                "start": (now + timedelta(hours=2)).isoformat(),
                "end": (now + timedelta(hours=8)).isoformat(),
            },
        }
        data = post("/api/plan/generate", body).json()
        _assert_keys(
            data,
            ["plan_id", "availability_window", "windows", "confidence", "reasoning", "signals_used", "generated_at"],
            "/api/plan/generate",
        )
        assert len(data["windows"]) >= 1, "plan has no windows"
        assert 0 <= data["confidence"] <= 100, f"confidence out of range: {data['confidence']}"
        for w in data["windows"]:
            _assert_keys(w, ["start", "end", "zone", "platform", "expected_nett_rm"], "plan.window")
        return data

    plan = r.step("POST /api/plan/generate", _generate_plan)

    def _ask_followup(question: str):
        body = {"plan_id": plan["plan_id"], "question": question}
        data = post("/api/plan/ask", body).json()
        _assert_keys(data, ["id", "plan_id", "question", "answer", "asked_at"], "/api/plan/ask")
        assert len(data["answer"]) > 10, "answer suspiciously short"
        return data

    if plan:
        for q in [
            "Why not KLCC at 20:00?",
            "How confident are you?",
            "Any weather or safety concerns?",
            "Which platform pays me best tonight?",
        ]:
            r.step(f"POST /api/plan/ask  ({q!r})", lambda q=q: _ask_followup(q))

        def _list_followups():
            data = get(f"/api/plan/{plan['plan_id']}/followups").json()
            _assert_keys(data, ["plan_id", "followups"], "/api/plan/:id/followups")
            assert len(data["followups"]) >= 4, f"expected >=4 followups, got {len(data['followups'])}"
            return data

        r.step(f"GET /api/plan/{plan['plan_id'][:8]}.../followups", _list_followups)

    r.section("Backtest")

    def _backtest():
        end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=7)
        body = {
            "driver_id": "local",
            "window": {"start": start.isoformat(), "end": end.isoformat()},
        }
        data = post("/api/backtest/run", body).json()
        _assert_keys(
            data,
            [
                "driver_id", "window", "days_covered",
                "baseline_nett_rm", "projected_nett_same_hours", "projected_nett_full_plan",
                "delta_rm", "delta_pct", "per_day",
            ],
            "/api/backtest/run",
        )
        assert data["days_covered"] > 0, "no days covered by backtest"
        return data

    bt = r.step("POST /api/backtest/run (7-day window)", _backtest)

    def _backtest_rejects_long_window():
        end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=120)
        body = {
            "driver_id": "local",
            "window": {"start": start.isoformat(), "end": end.isoformat()},
        }
        resp = session.post(f"{base_url}/api/backtest/run", json=body, timeout=10)
        assert resp.status_code == 400, f"expected 400 for long window, got {resp.status_code}"
        detail = resp.json()
        assert detail.get("error") == "window_too_long", f"unexpected error body: {detail}"
        return detail

    r.step("POST /api/backtest/run (>31d window should 400)", _backtest_rejects_long_window)

    r.section("Demo headline summary")
    if signals:
        w = signals.get("weather") or {}
        print(
            f"  - Weather today: {w.get('condition', 'n/a')}, "
            f"{w.get('temperature_c', '?')}C, rain {w.get('rain_mm', '?')} mm"
        )
        print(f"  - Events in Klang Valley: {len(signals.get('events', []))}")
        print(f"  - RON95: RM {signals.get('fuel', {}).get('ron95', '?')}/L")
    if totals:
        print(
            f"  - 14-day baseline: {totals.get('trip_count', '?')} trips, "
            f"RM {totals.get('total_nett_rm', '?')} nett"
        )
    if plan:
        print(
            f"  - Plan: {len(plan['windows'])} windows, "
            f"RM {plan.get('total_expected_nett_rm', '?')} expected, "
            f"confidence {plan.get('confidence', '?')}/100"
        )
    if bt:
        print(
            f"  - Backtest uplift: RM {bt.get('baseline_nett_rm', '?')} -> "
            f"RM {bt.get('projected_nett_same_hours', '?')} "
            f"(delta {bt.get('delta_pct', '?')}%, same-hours comparison)"
        )

    return r.summary()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GigShift end-to-end demo smoke test.")
    parser.add_argument("--base", default="http://localhost:5000", help="Backend base URL.")
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    raise SystemExit(run(args.base))

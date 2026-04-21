"""Phase D smoke test - backtest service.

Seeds a known-good history (no leakage between rate matrix and the
window under test), runs /api/backtest/run, and asserts the result is
coherent: totals match per-day, rate sources are sane, deltas are
arithmetic.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import sqlite3

from app import create_app


def _seed_trips(db_path: str, driver_id: str = "local-bt") -> None:
    """Insert a small synthetic history:
      - 25 trips in the 30 days BEFORE the backtest window (rate matrix)
      - 8  trips INSIDE the backtest window (baseline)
    """

    now = datetime.now(timezone.utc).replace(microsecond=0)
    backtest_start = now - timedelta(days=7)

    history_rows = []
    # History: Bangsar and PJ, strong RM/hr.
    for i in range(25):
        day_offset = 30 - i
        start = now - timedelta(days=day_offset, hours=0)
        start = start.replace(hour=18 + (i % 4))
        end = start + timedelta(minutes=30)
        zone = "bangsar" if i % 2 == 0 else "petaling_jaya_ss2"
        gross = 22.0 + (i % 5)
        commission = round(gross * 0.2, 2)
        nett = round(gross - commission, 2)
        history_rows.append(
            (
                driver_id, "grab",
                start.isoformat(), end.isoformat(),
                zone, "klcc",
                9.0, gross, commission, nett, 0.0, 1.0,
                None, now.isoformat(),
            )
        )

    # Baseline: weaker - only 8 trips in the window.
    baseline_rows = []
    for i in range(8):
        start = backtest_start + timedelta(days=i // 2, hours=19 + (i % 2))
        end = start + timedelta(minutes=25)
        gross = 15.0
        commission = 3.0
        nett = 12.0
        baseline_rows.append(
            (
                driver_id, "grab",
                start.isoformat(), end.isoformat(),
                "cheras", "ampang",
                5.0, gross, commission, nett, 0.0, 1.0,
                None, now.isoformat(),
            )
        )

    conn = sqlite3.connect(db_path)
    conn.execute("DELETE FROM trips WHERE driver_id = ?", (driver_id,))
    conn.executemany(
        """
        INSERT INTO trips (
            driver_id, platform, start_ts, end_ts, start_zone, end_zone,
            distance_km, gross_rm, commission_rm, nett_rm, tip_rm,
            surge_multiplier, source_upload_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        history_rows + baseline_rows,
    )
    conn.commit()
    conn.close()

    return backtest_start


def banner(msg: str) -> None:
    print("\n" + "=" * 70)
    print(msg)
    print("=" * 70)


def main() -> None:
    app = create_app()
    client = app.test_client()
    db_path = str(app.config["DB_PATH"])
    driver_id = "local-bt"

    # Seed the synthetic driver.
    backtest_start = _seed_trips(db_path, driver_id=driver_id)
    window_start = backtest_start.replace(microsecond=0).isoformat()
    window_end = (backtest_start + timedelta(days=4)).replace(microsecond=0).isoformat()

    banner(f"Run backtest for driver {driver_id} over 4 days")
    r = client.post(
        "/api/backtest/run",
        json={
            "driver_id": driver_id,
            "window": {"start": window_start, "end": window_end},
        },
    )
    print("HTTP:", r.status_code)
    assert r.status_code == 200, r.data
    body = r.get_json()
    print(json.dumps({k: v for k, v in body.items() if k != "per_day"}, indent=2))

    banner("Per-day summary")
    for d in body["per_day"]:
        print(
            f"  {d['date']}: baseline RM {d['baseline_nett_rm']:>6.2f} ({d['baseline_hours']:>4.2f}h, "
            f"{d['baseline_trips']} trips)  |  plan same-hrs RM {d['projected_nett_same_hours']:>6.2f}  "
            f"full-plan RM {d['projected_nett_full_plan']:>6.2f} ({d['plan_hours']:>4.1f}h)  "
            f"delta {d['delta_rm']:+.2f}"
        )

    banner("Rate sources used (should include zone_hour_platform, zone_hour, or overall)")
    sources = set()
    for d in body["per_day"]:
        for slot in d["slots"]:
            sources.add(slot["rate_source"])
    print("Sources seen:", sources)
    assert sources, "no slots produced"

    banner("Arithmetic consistency checks")
    for d in body["per_day"]:
        slot_sum = round(sum(s["projected_nett_rm"] for s in d["slots"]), 2)
        assert abs(slot_sum - d["projected_nett_full_plan"]) < 0.05, (slot_sum, d["projected_nett_full_plan"])
    total_full = round(sum(d["projected_nett_full_plan"] for d in body["per_day"]), 2)
    assert abs(total_full - body["projected_nett_full_plan"]) < 0.05
    print(f"Baseline:                    RM {body['baseline_nett_rm']:.2f}  ({body['baseline_hours_online']:.2f}h @ RM {body['baseline_rm_per_hour']:.2f}/hr)")
    print(f"Plan avg rate:               RM {body['projected_rm_per_hour']:.2f}/hr ({body['plan_hours_total']:.1f}h total)")
    print(f"Projected (same hours):      RM {body['projected_nett_same_hours']:.2f}")
    print(f"Projected (full plan):       RM {body['projected_nett_full_plan']:.2f}")
    print(f"Headline delta (same-hrs):   RM {body['delta_rm']:+.2f} ({body['delta_pct']:+.1f} %)")

    banner("Reject window > 31 days (safety guard)")
    r = client.post(
        "/api/backtest/run",
        json={
            "driver_id": driver_id,
            "window": {
                "start": backtest_start.isoformat(),
                "end": (backtest_start + timedelta(days=60)).isoformat(),
            },
        },
    )
    print("HTTP:", r.status_code, r.get_json())
    assert r.status_code == 400

    banner("Bad window payload (missing end)")
    r = client.post("/api/backtest/run", json={"window": {"start": window_start}})
    print("HTTP:", r.status_code)
    assert r.status_code == 400

    print("\nALL CHECKS PASSED")


if __name__ == "__main__":
    main()

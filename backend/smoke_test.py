"""End-to-end smoke test for all GigShift HTTP routes (mock-mode)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from app import create_app

app = create_app()
client = app.test_client()


def show(title: str, resp) -> None:
    print(f"\n=== {title} ===")
    print(f"  status: {resp.status_code}")
    data = resp.get_json()
    if data is None:
        print("  body: (non-JSON)")
        return
    compact = json.dumps(data, indent=2, default=str)
    lines = compact.splitlines()
    if len(lines) > 40:
        print("\n".join("  " + l for l in lines[:40]))
        print(f"  ... ({len(lines) - 40} more lines)")
    else:
        print("\n".join("  " + l for l in lines))


# 1. Health
show("GET /api/health", client.get("/api/health"))

# 2. Profile GET (default)
show("GET /api/profile", client.get("/api/profile"))

# 3. External signals
today = datetime.now(timezone.utc).date().isoformat()
show("GET /api/external/today", client.get(f"/api/external/today?date={today}"))

# 4. Analytics (expected empty, no trips yet)
show("GET /api/analytics/summary", client.get("/api/analytics/summary"))

# 5. Upload a trip batch (structured rows)
start = datetime.now(timezone.utc) - timedelta(days=2)
rows = [
    {
        "start_ts": (start + timedelta(hours=i * 0.7)).isoformat(),
        "end_ts": (start + timedelta(hours=i * 0.7 + 0.3)).isoformat(),
        "start_zone": ["klcc", "bangsar", "mid_valley", "sunway", "petaling_jaya_ss2"][i % 5],
        "end_zone": "mid_valley",
        "distance_km": 6.5 + i * 0.3,
        "gross_rm": 18.0 + i * 1.2,
        "commission_rm": 3.5 + i * 0.2,
        "nett_rm": 14.5 + i * 1.0,
        "tip_rm": 0.0,
        "surge_multiplier": 1.1 if i % 3 == 0 else 1.0,
    }
    for i in range(10)
]
show(
    "POST /api/earnings/upload (grab)",
    client.post("/api/earnings/upload", json={"platform": "grab", "rows": rows}),
)

# 6. Analytics again (should have data now)
show("GET /api/analytics/summary (after upload)", client.get("/api/analytics/summary"))

# 7. Plan generation (mock-mode)
tonight_start = datetime.now(timezone.utc).replace(hour=18, minute=0, second=0, microsecond=0)
tonight_end = tonight_start + timedelta(hours=5)
plan_resp = client.post(
    "/api/plan/generate",
    json={
        "window": {
            "start": tonight_start.isoformat(),
            "end": tonight_end.isoformat(),
        }
    },
)
show("POST /api/plan/generate", plan_resp)
plan = plan_resp.get_json() or {}

# 8. Follow-up Q&A
if plan.get("plan_id"):
    show(
        "POST /api/plan/ask",
        client.post(
            "/api/plan/ask",
            json={
                "plan_id": plan["plan_id"],
                "question": "Why not KLIA tonight?",
            },
        ),
    )

# 9. Backtest stub
show("POST /api/backtest/run", client.post("/api/backtest/run", json={"weeks": 4}))

print("\nSmoke test finished.")

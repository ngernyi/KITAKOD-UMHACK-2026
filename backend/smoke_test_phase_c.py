"""Phase C end-to-end smoke test.

Exercises the full personalization flow:
  1. Upload messy CSVs (per-platform aliases + fuzzy zones)
  2. Save profile with preferences
  3. Pull totals & analytics
  4. Generate a plan (mock mode) and prove preferences reached the prompt
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app import create_app


GRAB_CSV = """booking_time,pickup_area,dropoff_area,distance,total_fare,service_fee,driver_earning
2026-04-18T08:10:00+08:00,PJ,KLCC,14.0,28.00,5.60,22.40
2026-04-18T08:55:00+08:00,KLCC,Bangsar,6.8,14.50,2.90,11.60
2026-04-18T09:40:00+08:00,Mid Valley,KL Sentral,3.1,9.00,1.80,7.20
2026-04-18T18:05:00+08:00,Pavilion,Bangsar South,5.9,13.50,2.70,10.80
2026-04-18T19:00:00+08:00,Bangsar,KLCC,4.5,11.00,2.20,8.80
"""

MAXIM_CSV = """order_time,origin_area,destination_area,km,fare,maxim_fee,net
2026-04-17T22:00:00+08:00,Subang Jaya,Sunway,4.1,9.50,1.40,8.10
2026-04-17T22:40:00+08:00,Sunway,USJ,5.0,10.50,1.60,8.90
2026-04-17T23:30:00+08:00,PJ SS2,Kota Damansara,6.0,12.00,1.80,10.20
"""

BAD_CSV = """pickup_time,pickup_area,fare
not-a-date,Neverland,15.00
"""


def banner(msg: str) -> None:
    print("\n" + "=" * 70)
    print(msg)
    print("=" * 70)


def main() -> None:
    app = create_app()
    client = app.test_client()

    banner("1. Upload Grab CSV (pickup_area, total_fare, driver_earning aliases)")
    r = client.post(
        "/api/earnings/upload",
        json={"platform": "grab", "csv_text": GRAB_CSV, "driver_id": "local"},
    )
    print(r.status_code, r.get_json())

    banner("2. Upload Maxim CSV (order_time, origin_area, net aliases)")
    r = client.post(
        "/api/earnings/upload",
        json={"platform": "maxim", "csv_text": MAXIM_CSV, "driver_id": "local"},
    )
    print(r.status_code, r.get_json())

    banner("3. Upload a malformed row (should report rejection cleanly)")
    r = client.post(
        "/api/earnings/upload",
        json={"platform": "grab", "csv_text": BAD_CSV},
    )
    print(r.status_code, r.get_json())

    banner("4. Save profile with preferences")
    r = client.put(
        "/api/profile",
        json={
            "driver_id": "local",
            "display_name": "Ahmad",
            "vehicle_type": "car",
            "fuel_type": "ron95",
            "home_zone": "petaling_jaya_ss2",
            "platforms": ["grab", "maxim", "airasia_ride"],
            "vehicle_fuel_consumption_l_per_100km": 7.2,
            "preferences": "Avoid KLIA after 22:00, prefer short trips in Bangsar/PJ.",
        },
    )
    print(r.status_code, r.get_json())

    banner("5. Totals")
    r = client.get("/api/earnings/totals?days=14")
    print(r.status_code, r.get_json())

    banner("6. Analytics summary")
    r = client.get("/api/analytics/summary?days=14")
    data = r.get_json()
    print(r.status_code, "trips:", data.get("trip_count"))
    print("top zones:", [z["zone"] for z in data.get("by_zone", [])[:3]])
    print("by platform:", [(p["platform"], p["trips"]) for p in data.get("by_platform", [])])

    banner("7. Generate plan (mock mode) - expect 'preferences:driver_freetext' signal")
    now = datetime.now(timezone.utc).replace(microsecond=0)
    r = client.post(
        "/api/plan/generate",
        json={
            "driver_id": "local",
            "window": {
                "start": (now + timedelta(hours=1)).isoformat(),
                "end": (now + timedelta(hours=7)).isoformat(),
            },
        },
    )
    plan = r.get_json()
    print(r.status_code, "plan_id:", plan.get("plan_id"))
    print("warnings:", plan.get("warnings"))
    print("signals_used:", plan.get("signals_used"))
    print("reasoning:", (plan.get("reasoning") or "")[:200])

    banner("8. Template download")
    r = client.get("/api/earnings/template?platform=grab")
    print(r.status_code, "content-type:", r.headers.get("Content-Type"))
    print(r.data.decode("utf-8").strip())


if __name__ == "__main__":
    main()

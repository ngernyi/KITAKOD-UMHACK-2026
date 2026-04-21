# GigShift — Multi-Platform Driver Optimiser

**UMHackathon 2026 · Domain 2: AI for Economic Empowerment & Decision Intelligence**

GigShift is a GLM-powered co-pilot for Klang Valley e-hailing drivers who
split time across Grab, Maxim, AirAsia Ride, and inDrive. It ingests a
driver's own earning history plus live external signals (weather, public
holidays, events, fuel prices) and tells them — for a shift window they
choose — **where to be, which app to open, and roughly how much they'll
earn**. Every recommendation is explainable, auditable, and back-testable
against their actual history.

| | |
| :-- | :-- |
| **Persona** | Multi-platform e-hailing drivers, Klang Valley |
| **Pain point** | Drivers lose 15-30 % of potential nett by guessing the wrong zone / app / hour |
| **Core reasoning** | Z.AI GLM (mock-mode when no API key) |
| **Economic impact (baseline demo)** | **+11.9 % nett** on a 7-day same-hours backtest |
| **Status** | Preliminary-round build · end-to-end demoable offline |

---

## Documentation

See [`documentation/`](./documentation) for the full product & system docs
(PRD, SAD, QATD) produced for the preliminary round. A scope-locked
overview lives in [`documentation/README.md`](./documentation/README.md).

## Repo layout

```
.
├── backend/                 # Flask + SQLite + Pydantic API
│   ├── app/
│   │   ├── models/          # Pydantic schemas (Trip, Profile, Signals, Plan, Backtest)
│   │   ├── services/        # Business logic (glm, plan, earnings, analytics, backtest, external_data)
│   │   ├── routes/          # HTTP endpoints
│   │   └── schema.sql       # SQLite DDL (idempotent)
│   ├── data/                # Seeded JSON: zones, events, holidays, fuel
│   ├── scripts/
│   │   └── seed_demo_data.py   # Deterministic 60-day synthetic trip history
│   ├── smoke_test*.py       # Per-phase backend smoke tests
│   └── main.py              # Entry point (python main.py)
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── pages/           # Plan / Dashboard / Earnings / Backtest / Profile
│       ├── components/      # PlanView, FollowupPanel, ExternalDataPanel, etc.
│       └── api.js           # Thin client wrapper around the backend
├── scripts/
│   ├── demo_smoke.py        # End-to-end API walkthrough (PASS/FAIL report)
│   └── md_to_docx.py        # Convert docs -> DOCX via pypandoc
└── documentation/
    ├── sample/              # Original template artefacts (domain brief, etc.)
    └── *.md / *.docx        # PRD / SAD / QATD for GigShift
```

---

## Quick start (90-second demo path)

Pre-requisites: **Python 3.11+**, **Node 18+**, and ~2 minutes.

### 1 · Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows PowerShell
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
copy .env.example .env            # or `cp` on macOS/Linux — ZAI_API_KEY can stay empty
python main.py
```

Backend now serves `http://localhost:5000`. Mock-mode is active if
`ZAI_API_KEY` is empty; real GLM is used if set.

### 2 · Seed realistic demo data (recommended)

```bash
# from backend/ with venv active
python -m scripts.seed_demo_data --reset
```

This drops ~880 synthetic trips (60 days, multi-platform, realistic
peak/weekend/rainy-surge patterns) into the local SQLite so the
Dashboard, Analytics, and Backtest pages look alive on first load.

### 3 · Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`**. The Vite dev server proxies `/api/*`
to Flask, so everything Just Works.

### 4 · One-shot sanity check (recommended before demos)

```bash
# from repo root, with the backend running
python scripts/demo_smoke.py
```

Hits every public endpoint, asserts shape + invariants, and prints a
headline summary (weather, baseline earnings, plan preview, backtest
uplift). Exit code `0` = ready to demo.

---

## What the UI shows

| Route | What it does |
| :-- | :-- |
| `/`          | **Plan** — pick a shift window, see recommended zone+platform per time slot, per-slot rationale, signals-used chips, and ask follow-up questions in plain English. Top-of-page panel shows exactly the external data feeding the prompt. |
| `/dashboard` | **Dashboard** — your nett-by-hour, top zones, platform mix, RM/hour per platform, and best platform per hour across the last 14 days. |
| `/earnings`  | **Earnings** — paste or upload CSV exports from any of the 4 platforms; per-platform column aliases and fuzzy zone names are handled server-side. Download a pre-filled template for any platform. |
| `/backtest`  | **Backtest** — pick a historical window, get **two projections**: (a) *same-hours* comparison (apples-to-apples — drives the headline delta) and (b) *full-plan* aspirational ceiling. Per-day chart + per-slot table with rate-source badges so judges can audit every number. No data leakage: the rate matrix for each day is built only from trips strictly before that day. |
| `/profile`   | **Profile** — vehicle + fuel + home zone + enabled platforms + free-text preferences ("avoid KLIA after 22:00 …") that are injected into the GLM prompt as a soft hint (hard rules still win). |

---

## Public API reference

Base URL: `http://localhost:5000/api`

### System
| Method | Path | Purpose |
| :-- | :-- | :-- |
| `GET`  | `/health` | Liveness + service name + server time |

### Profile
| Method | Path | Purpose |
| :-- | :-- | :-- |
| `GET`  | `/profile?driver_id=local` | Current profile (defaults filled for `local`) |
| `PUT`  | `/profile` | Upsert profile. Returns the saved record. |

### Earnings
| Method | Path | Purpose |
| :-- | :-- | :-- |
| `POST` | `/earnings/upload` | Ingest a `TripUpload` (`csv_text` or `rows`). Returns `{rows_inserted, duplicates_skipped, rejection_reasons, warnings}`. |
| `GET`  | `/earnings/template?platform=grab` | Platform-specific CSV template with example rows |
| `GET`  | `/earnings/totals?days=14` | Aggregate gross / nett / trip-count over a lookback |

### Analytics
| Method | Path | Purpose |
| :-- | :-- | :-- |
| `GET`  | `/analytics/summary?days=14` | Per-platform, per-zone, per-hour, best-platform-per-hour aggregation |

### External signals
| Method | Path | Purpose |
| :-- | :-- | :-- |
| `GET`  | `/external/today?date=YYYY-MM-DD` | Weather + fuel + holidays + school-break + events for a given KL date |

### Plan
| Method | Path | Purpose |
| :-- | :-- | :-- |
| `POST` | `/plan/generate` | `{driver_id, window:{start,end}}` → a full `Plan` (windows, signals_used, reasoning, confidence, warnings). Mock-mode flagged via `warnings: ["glm_mock_mode"]`. |
| `POST` | `/plan/ask` | `{plan_id, question}` → `{id, question, answer, asked_at, signals_referenced}`. Intent-routed when no API key. |
| `GET`  | `/plan/:plan_id/followups` | Persisted Q&A thread for a plan |

### Backtest
| Method | Path | Purpose |
| :-- | :-- | :-- |
| `POST` | `/backtest/run` | `{driver_id, window:{start,end}}` → baseline vs projected (same-hours and full-plan) per day + per-slot rate-source audit. Capped at 31 days. |

### Legacy / debug
| `POST` | `/glm/predict`, `/glm/analyze` | Back-compat debug wrappers around `call_glm()` |

---

## How the pieces fit together

```
                  (you)
                    │  "Plan my 5pm-11pm shift"
                    ▼
   ┌──────────────── React (Vite, port 5173) ────────────────┐
   │  Plan / Dashboard / Earnings / Backtest / Profile pages │
   └─────────────────────────┬───────────────────────────────┘
                             │ /api/*  (Vite proxy)
                             ▼
   ┌──────────────── Flask (port 5000) ──────────────────────┐
   │  routes/api.py  — thin validators                       │
   │  services/                                              │
   │    plan_service        ← orchestrator                   │
   │    analytics_service   ← pre-aggregates history         │
   │    external_data_svc   ← seeded KL signals (weather…)   │
   │    earnings_service    ← CSV aliases + zone resolver    │
   │    backtest_service    ← RateMatrix, no-leakage replay  │
   │    glm_service         ← prompts + Z.AI + mock fallback │
   └─────────┬──────────────────────────────┬────────────────┘
             │                              │
             ▼                              ▼
     SQLite (gigshift.db)           Z.AI GLM (or mock)
     drivers / trips / plans        plan + follow-up JSON
     daily_signals / followups
```

Design principles the codebase follows:

1. **GLM is the reasoning engine, not a content generator.** Every call
   has a typed input (`DriverProfile`, `AnalyticsSummary`, `DailySignals`,
   `TimeWindow`) and a typed output (`Plan`). Prompts are centralised in
   `app/services/prompts.py`. The mock exists to keep the entire pipeline
   demoable without an API key — it reads the same inputs and returns the
   same schema.
2. **Zone whitelist is a hard rule.** Both the system prompt and the
   validator reject any zone outside `backend/data/zones_kl.json`.
3. **Preferences are a soft hint.** Free-text driver preferences are
   injected into the user prompt with explicit guard rails: the model is
   told that preferences never override hard rules or the output schema,
   and must be ignored if they try to hijack the role or format.
4. **Backtest is apples-to-apples.** The headline delta is computed on
   *same-hours projection* (plan RM/hr × hours driver actually worked),
   not the aspirational full-plan ceiling. Every per-slot rate carries a
   `rate_source` badge (`zone_hour_platform` → `zone_hour` → `zone` →
   `overall` → `default`) so the number is auditable.
5. **No data leakage.** For each day `d` in the backtest window, the
   `RateMatrix` and `AnalyticsSummary` are built only from trips with
   `start_ts < d`. The plan for `d` never "sees" what actually happened.

---

## Environment variables (`backend/.env`)

```dotenv
# Optional — leave empty to use the deterministic signal-aware mock.
ZAI_API_KEY=
ZAI_API_URL=https://api.z.ai/api/paas/v4/chat/completions

# SQLite path (default: backend/gigshift.db)
DB_PATH=gigshift.db

# Flask
FLASK_ENV=development
```

---

## Development workflow

- **Backend auto-reloads** on file changes (Flask debug mode).
- **Frontend HMR** on save (Vite).
- Per-phase backend smoke tests live in `backend/smoke_test*.py`.
- End-to-end smoke: `python scripts/demo_smoke.py` from repo root.
- Commit style: Conventional Commits (`feat(phase-*):`, `docs(*):`,
  `chore(*):`).
- Docs → DOCX: `python scripts/md_to_docx.py documentation/*.md`.

---

## Licensing & attribution

This project is a UMHackathon 2026 preliminary-round submission. Seeded
data (`backend/data/*.json`) is illustrative and synthetic; any
resemblance to a specific driver's real history is coincidental and
intentional (see `backend/scripts/seed_demo_data.py`).

For questions about how this repo was built, see
[`AI_INSTRUCTIONS.md`](./AI_INSTRUCTIONS.md) and the per-phase commit
history on the `feature/driver-copilot` branch.

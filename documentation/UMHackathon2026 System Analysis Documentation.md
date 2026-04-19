# SYSTEM ANALYSIS DOCUMENTATION (SAD)
UMHackathon 2026 — GigShift

---

## Introduction

This document describes the technical architecture, component design, data flows, and GLM integration strategy for **GigShift**, the AI Co-Pilot for Multi-Platform E-Hailing Drivers. It is the direct technical counterpart to the [Product Requirement Document](./UMHackathon2026%20Product%20Requirement%20Documentation.md). Every architectural decision here traces back to a requirement or constraint in the PRD, and every requirement in the PRD maps to a component here.

**Project Name:** GigShift — AI Co-Pilot for Multi-Platform E-Hailing Drivers

---

## 1. Purpose

The system analysis document captures the technical scope, architectural decisions, and integration boundaries for GigShift. It serves as the single source of truth for developers, testers, and reviewers about *how* the product delivers on the PRD.

**Key Elements Covered:**
- High-level architecture (clients, services, data layer)
- Z.AI GLM integration as a first-class service layer (not a generic "AI module")
- End-to-end data flows (upload, plan generation, follow-up Q&A, backtest)
- Technology stack and justification
- External API dependencies and failure handling
- API contracts (endpoint-by-endpoint request/response shapes)

---

## 2. Background

Multi-platform e-hailing drivers in Malaysia make high-frequency, high-consequence income decisions (which platform, which zone, when to switch) using fragmented data and intuition. No commercial tool solves this — the platforms themselves have no incentive to build a cross-platform advisor. The GigShift system is designed as a driver-side decision-support layer, legally clean (no platform scraping) and economically aligned with the user (no platform fees to evade, only driver earnings to optimise).

**Previous Version:** None — this is a greenfield project. The existing `basic-template` branch provides a Flask + React scaffolding with a placeholder `glm_service.py` that returns mock responses when no API key is configured. GigShift builds directly on that scaffold.

---

## 3. System Architecture & Design

### 3.1 High Level Architecture Overview

| Component | Type | Description |
|-----------|------|-------------|
| Web Client | Single-Page App (React + Vite) | Driver-facing UI: upload, dashboard, Next Shift Plan card, follow-up chat, backtest view. Runs on `http://localhost:5173` (dev). |
| Backend API | Flask (Python) REST service | All business logic, prompt construction, GLM orchestration. Runs on `http://localhost:5000`. Exposes `/api/*`. |
| GLM Service Layer | Internal Python module (`app/services/glm_service.py`) | Wraps all Z.AI GLM calls; owns prompt templates, JSON parsing, retries, fallbacks, and mock-mode for dev. |
| External Data Service | Internal Python module (`app/services/external_data_service.py`) | Fetches weather, public holidays, petrol price, events; normalises into a common `daily_signals` object; caches responses for 24h. |
| Earnings Service | Internal Python module (`app/services/earnings_service.py`) | Parses per-platform CSV/paste uploads into a canonical `Trip` schema; stores in DB. |
| Analytics Service | Internal Python module (`app/services/analytics_service.py`) | Aggregates trips into per-zone / per-hour / per-platform summaries used as prompt context. |
| Plan Service | Internal Python module (`app/services/plan_service.py`) | Orchestrator: collects driver profile + analytics + external signals → calls `glm_service.generate_plan()` → parses + validates → returns plan. Also exposes `ask_followup()`. |
| Backtest Service | Internal Python module (`app/services/backtest_service.py`) | Replays historical days through the Plan Service, computes RM-delta between recommended vs. actual. |
| Persistence | SQLite (file-based, `gigshift.db`) | Stores driver profile, normalised trips, cached external signals, generated plans, follow-up Q&A transcripts. Single-user for MVP; no auth. |
| Z.AI GLM | **External third-party API** | The reasoning engine. Called only from `glm_service.py`. |

**Architecture Description:**
The system is a classic **client-server** architecture with the GLM explicitly promoted to a **first-class service layer** rather than a hidden utility call. The frontend is a thin presentation layer — it contains **no prompt text**, **no GLM credentials**, and **no direct external API calls**. All intelligence, data integration, and security-sensitive logic live in the Flask backend. This separation is deliberate: it means we can iterate on prompts, swap models, or change data sources without touching the UI, and it protects against prompt-injection via the client. For the preliminary round, the entire system runs locally (no cloud deployment), which is sufficient for demo and eliminates deployment risk during a 1-week build.

---

### 3.2 LL.M as Service Layer (Z.AI GLM Integration)

The Z.AI GLM is **not** treated as a generic "AI module." It is a named service with a defined contract, input/output schema, error semantics, and fallback behaviour. This section answers exactly how it is wired in.

#### 3.2.1 Dependency Diagram

| Component | Direction | Description |
|-----------|-----------|-------------|
| Web Client (`PlanCard.jsx`, `FollowupChat.jsx`) | → Backend API | Sends driver intent: "generate plan for tonight 6–11pm" or a follow-up question. Never sends raw prompts. |
| Backend API (`routes/api.py`) | → Plan Service | Receives the HTTP request, validates, delegates to Plan Service. |
| Plan Service (`services/plan_service.py`) | → Analytics Service | Requests per-zone/hour/platform summary for the driver's last 14 days. |
| Plan Service | → External Data Service | Requests today's normalised external signals. |
| Plan Service | → GLM Service | Constructs `PlanContext` (profile + history summary + signals) and calls `glm_service.generate_plan(context)`. |
| GLM Service | → Z.AI GLM (external API) | Assembles system + few-shot + user prompt; POSTs to Z.AI endpoint with JSON schema instruction. |
| Z.AI GLM | → GLM Service | Returns raw JSON (or markdown-wrapped JSON). |
| GLM Service (Response Parser) | → Plan Service | Parses JSON via `parse_json_response` (with regex fallback); validates schema; on failure triggers one corrective retry or falls back. |
| Plan Service | → Persistence (SQLite) | Stores the generated plan with timestamp + prompt hash (for backtest / reproducibility). |
| Plan Service | → Backend API | Returns validated plan object. |
| Backend API | → Web Client | Serialises plan as JSON response; UI renders the plan card. |

#### 3.2.2 Questions Answered (per template)

**How are prompts being constructed and sent to the GLM API?**
Prompts are assembled exclusively in `glm_service.py`. Each use case (plan generation, follow-up Q&A, explanation) has a dedicated prompt-builder function that takes typed Python objects (not raw strings) and assembles: (1) a fixed **system prompt** defining role, constraints, JSON schema, and zone whitelist; (2) **two or three few-shot examples** demonstrating input → output shape; (3) a **user-turn message** containing the current context (driver profile summary, last-14-day analytics, today's external signals, and optionally the prior plan for follow-ups). The assembled messages are POSTed to Z.AI's chat-completion endpoint via `call_glm_with_context` (already scaffolded in the template).

**What goes into the context window?**
For `generate_plan`:
- System prompt (~800 tokens, fixed)
- Zone whitelist for Klang Valley (~150 tokens, fixed)
- JSON output schema (~200 tokens, fixed)
- 2 few-shot examples (~1500 tokens total)
- Driver profile summary (~100 tokens)
- Last-14-day analytics summary (pre-aggregated, not raw trips) (~500 tokens)
- Today's external signals (weather, holidays, fuel price, events) (~400 tokens)
- Availability window + current time (~50 tokens)
- **Total target:** ~3,700 tokens in, ~1,000 tokens out.

For `ask_followup`:
- System prompt + zone whitelist (~950 tokens)
- Prior plan JSON (~600 tokens)
- Driver question (≤500 chars)
- **Total target:** ~1,700 tokens in, ~400 tokens out.

**How is the system receiving, parsing the responses and passing to the next component?**
`glm_service.py` receives the raw HTTP response, extracts the assistant message content, and calls `parse_json_response` (already in the template) which first tries `json.loads`, then regex-extracts the first `{...}` block, then returns `{'raw_text': ...}` as a last resort. Plan Service then validates the parsed object against a Pydantic-style schema (required keys: `windows[]`, `confidence`, `reasoning`, `signals_used[]`). If validation fails, it triggers one corrective retry with an appended system message *"Your previous response missed required keys X, Y. Return only valid JSON matching the schema."*. If the retry also fails, the Plan Service returns a deterministic fallback plan based on the driver's own historical top-performing zone + platform for that hour band.

**Where are token limitations enforced or inputs chunked before reaching GLM?**
Token budgets are enforced at two layers:
1. **Pre-aggregation** — raw trip records never enter the prompt. The Analytics Service produces a compact summary (top zones by earn/hr, top hours by earn/hr, weather-conditioned averages). This is the primary token-control mechanism.
2. **Hard cap in `glm_service.py`** — a `MAX_CONTEXT_TOKENS = 6000` constant; if assembled messages exceed this (estimated via `tiktoken` or a simple char/4 heuristic), the oldest weeks of history summary are dropped first until within budget.

#### 3.2.3 Major API Calls

| From | To | API Endpoint | Purpose |
|------|-----|---------------|---------|
| Web Client | Backend API | `POST /api/plan/generate` | Request a new Next Shift Plan for a given availability window. |
| Web Client | Backend API | `POST /api/plan/ask` | Ask a follow-up question referencing the latest plan. |
| Web Client | Backend API | `POST /api/earnings/upload` | Upload CSV or pasted text for a specific platform. |
| Web Client | Backend API | `GET /api/analytics/summary` | Fetch aggregated charts (per platform/zone/hour). |
| Web Client | Backend API | `GET /api/external/today` | Fetch today's external signals for the transparency panel. |
| Web Client | Backend API | `POST /api/backtest/run` | Run the backtest over a historical window. |
| Web Client | Backend API | `GET/PUT /api/profile` | Read/update driver profile. |
| Backend API (GLM Service) | Z.AI GLM | `POST <ZAI_API_URL>/chat` | Plan generation and follow-up Q&A (chat-completion with messages array). |
| Backend API (External Data Service) | OpenWeather API | `GET /data/2.5/forecast?q=Kuala+Lumpur` | Weather forecast for the shift day. |
| Backend API (External Data Service) | Public Holidays (Calendarific or seeded) | `GET /api/v2/holidays?country=MY&year=2026` | Public holiday calendar. |
| Backend API (External Data Service) | MOF weekly RON95/diesel (seeded JSON for MVP) | — | Fuel price for the week. |
| Backend API (External Data Service) | Seeded events JSON | — | Curated KL events (concerts, matches, expos) for the demo window. |

---

### 3.3 Sequence Diagram (User Interaction Flow)

**Scenario: Driver generates the Next Shift Plan for tonight.**

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | Driver | Web Client | Driver opens the Plan tab and selects availability window "Today 6:00pm – 11:00pm", clicks "Plan my shift". |
| 2 | | Web Client → Backend API | `POST /api/plan/generate { window: {start, end}, driver_id: "local" }` |
| 3 | | Backend API | Validates input (window not in past beyond tolerance, ≤12h duration, valid ISO). |
| 4 | | Backend API → Plan Service | `plan_service.generate_plan(window, driver_id)` |
| 5 | | Plan Service → Earnings Service | `get_trips(driver_id, last_days=14)` |
| 6 | | Plan Service → Analytics Service | `summarise(trips)` → produces `AnalyticsSummary` |
| 7 | | Plan Service → External Data Service | `get_daily_signals(date=window.date, city="KL")` |
| 8 | | External Data Service | Returns cached signals if <24h old; otherwise fetches OpenWeather + holidays + reads seeded fuel/events JSON; caches result. |
| 9 | | Plan Service → GLM Service | `glm_service.generate_plan(context=PlanContext(...))` |
| 10 | | GLM Service | Builds system + few-shot + user messages; enforces token budget; calls Z.AI GLM (or mock if no key). |
| 11 | | Z.AI GLM | Processes and returns JSON with `windows[]`, `confidence`, `reasoning`, `signals_used[]`. |
| 12 | | GLM Service | Parses JSON; validates schema; on failure, one corrective retry. |
| 13 | | Plan Service → Persistence | Stores plan row with timestamp, prompt hash, output. |
| 14 | | Plan Service → Backend API | Returns validated Plan object. |
| 15 | | Backend API → Web Client | `200 OK` with plan JSON. |
| 16 | Driver | Web Client | Plan card renders with time-sliced recommendation, reasoning text, confidence bar, signal chips. |

**Scenario: Driver asks a follow-up question.**

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | Driver | Web Client | Types "why not KLIA tonight?" in the follow-up chat input. |
| 2 | | Web Client → Backend API | `POST /api/plan/ask { plan_id, question }` |
| 3 | | Backend API → Plan Service | `plan_service.ask_followup(plan_id, question)` |
| 4 | | Plan Service → Persistence | Fetches the cached plan + the same-session context. |
| 5 | | Plan Service → GLM Service | `glm_service.ask_followup(prior_plan, question)` |
| 6 | | GLM Service | Builds system + prior plan + question messages; calls Z.AI GLM. |
| 7 | | GLM Service → Plan Service | Returns answer text (no strict JSON schema here — plain explanation). |
| 8 | | Backend API → Web Client | Returns answer. |
| 9 | Driver | Web Client | Answer appended below the plan card in conversational view. |

---

### 3.4 Technological Stack

| Layer | Technology | Justification |
|-------|------------|----------------|
| Frontend | React 18 + Vite | Already scaffolded in `basic-template`; fast HMR, low ceremony, good ecosystem for charts (Recharts) and forms. Zero-config dev server. |
| Frontend charts | Recharts | React-native charting; simple declarative API; sufficient for line/bar charts on earnings dashboard. |
| Frontend styling | Plain CSS (for MVP) | Avoids the time cost of setting up Tailwind/MUI for a 1-week build. Can be upgraded later without refactor. |
| Backend framework | Flask 2.3+ | Already scaffolded; minimal boilerplate; perfect for a small REST API; easy mocking for tests. |
| Backend HTTP client | `requests` | Already in `requirements.txt`; standard choice for synchronous outbound API calls. |
| Persistence | SQLite (via `sqlite3` stdlib or SQLAlchemy) | File-based, zero-setup, supports our single-user MVP needs. Upgradable to Postgres without schema changes if we introduce multi-user auth in later rounds. |
| Data validation | Pydantic v2 | Type-safe validation of GLM outputs and API inputs; self-documents schemas. |
| Env / config | `python-dotenv` | Already in `requirements.txt`; standard `.env` pattern. |
| AI / Reasoning | **Z.AI GLM** | Mandated by the hackathon; our load-bearing reasoning engine for plan generation, explanation, and Q&A. Justification detailed in PRD §4.3.1. |
| External APIs | OpenWeather (free tier), Calendarific (free tier) or seeded holidays JSON | Free, well-documented, ample quota for demo; fallback to seeded JSON eliminates runtime dependency on external uptime during judging. |
| Deployment | Local dev only for preliminary round | A 1-week build does not justify cloud deployment risk; judges can run locally per the README's existing Quick Start. |
| Version control / CI | Git (GitHub) + feature-branch workflow | Per `AI_INSTRUCTIONS.md` — `feature/driver-copilot` branch, never pushes to `main` or `basic-template`. Light GitHub Actions for Python linting (optional). |

---

### 3.5 Data Flow Diagram (DFD)

| Level | Description |
|-------|-------------|
| **External Entities** | Driver (human); Z.AI GLM (external reasoning engine); OpenWeather API; Public Holidays API / seeded JSON; Seeded fuel price / events JSON. |
| **Processes** | P1: Earnings Ingestion (parse CSV → canonical Trip); P2: External Signal Fetch (weather/holidays/fuel/events → DailySignals); P3: Analytics Aggregation (Trip[] → AnalyticsSummary); P4: Prompt Construction (profile + analytics + signals → LLM messages); P5: GLM Invocation + JSON Parsing; P6: Plan Validation + Fallback; P7: Backtest Replay. |
| **Data Stores** | DS1: `drivers` (profile); DS2: `trips` (normalised per-trip records); DS3: `daily_signals` (cached external data by date); DS4: `plans` (generated plans + prompt hash + output); DS5: `followups` (Q&A transcripts tied to plans). |
| **Data Flows** | Driver → P1 → DS2; P2 ↔ External APIs → DS3; DS2 → P3 (via Analytics Service); DS1 + P3.out + DS3 → P4 → P5 (Z.AI GLM) → P6 → DS4 → Driver (UI); Driver question + DS4 → P5 → DS5 → Driver; DS2 + DS3 → P7 → Driver. |

---

## 4. Data Flows

The system has four canonical data flows. Each is designed to keep the **GLM's token budget small** (by pre-aggregating in Python) and to keep the **frontend dumb** (all intelligence server-side).

1. **Upload flow (driver provides earnings).**
   Driver pastes / uploads CSV → Frontend `POST /api/earnings/upload { platform, payload }` → Backend `earnings_service.ingest()` → per-platform parser → canonical `Trip` schema (`id, platform, start_ts, end_ts, start_zone, end_zone, distance_km, gross_rm, commission_rm, nett_rm, tip_rm, surge_multiplier`) → SQLite `trips` table → returns `{ rows_inserted, date_range }` to UI.

2. **Plan generation flow (core GLM interaction).**
   Driver requests plan → Frontend `POST /api/plan/generate { window }` → Backend Plan Service orchestrates: (a) read driver profile from DS1, (b) read last-14-day trips from DS2, (c) analytics aggregation in Python, (d) external signals for the shift date from DS3 or live fetch (cached 24h), (e) build typed `PlanContext`, (f) call `glm_service.generate_plan(context)` which assembles messages and POSTs to Z.AI, (g) parse + validate JSON, (h) persist plan in DS4, (i) return plan → Frontend renders `PlanCard`.

3. **Follow-up Q&A flow.**
   Driver types question → Frontend `POST /api/plan/ask { plan_id, question }` → Backend Plan Service loads prior plan from DS4 → `glm_service.ask_followup(plan, question)` → Z.AI GLM returns answer text → persist in DS5 → return to UI → appended to the conversation.

4. **Backtest flow.**
   Driver clicks "Run backtest (last 4 weeks)" → Frontend `POST /api/backtest/run { weeks: 4 }` → Backend Backtest Service iterates over each historical day, reconstructs the context **as it would have been that day** (same profile, trips up to D-1, signals for D), calls Plan Service (with reduced temperature for determinism), compares the plan's recommended zones/platforms to the driver's actual highest-earning zones/platforms that day, computes RM delta → aggregates into a summary `{ total_actual_rm, total_if_followed_rm, delta_rm, delta_pct, per_day: [...] }` → UI renders chart + headline metric.

---

## 5. Model Process

The end-to-end workflow of the three core features:

1. **Next Shift Plan Generation.** This is the GLM-centric core loop described in §3.3 and §4 above. The model is prompted with a structured system prompt (role + constraints + JSON schema + zone whitelist), few-shot examples, and the current context (profile + history summary + external signals + availability window). It returns a time-sliced plan with platform, zone, reasoning, and confidence. The Plan Service validates, stores, and returns.

2. **Follow-up Q&A.** A conversational layer that re-uses the same system prompt plus the prior plan's JSON as assistant-turn context, then the driver's question. The response is free-form text (not JSON) — the UI renders it as a conversational reply. This demonstrates the GLM's context-aware reasoning: the answer must not contradict the plan it just generated.

3. **Backtest Report.** A deterministic replay of historical days using the Plan Service at reduced temperature. For each day, the system compares recommended platform+zone to the driver's actual highest-earning platform+zone that day and computes an RM delta. Aggregated, this produces the product's headline quantifiable impact metric — "+RM X/week if you had followed GigShift." This is how we earn the PRD's "quantifiable impact" judging criterion on the driver's own data rather than on marketing claims.

---

## 6. Stakeholders

| Stakeholder | Role | Expectations |
|-------------|-----|-------------|
| Driver (primary user, "Ahmad") | End user; income optimiser | Clear, actionable plan in ≤ 10 s; transparent reasoning; no BS; system respects their time and autonomy. |
| Hackathon Judges | Evaluators | Demonstrable GLM-load-bearing design; quantifiable impact backed by evidence; clear target user; functional demo. |
| Development Team | Build + maintain | Clear API contracts; modular architecture; mock-mode for dev without API key; documented prompts and schemas. |
| QA / Testing | Validate correctness | Defined endpoint contracts; request/response shapes; edge cases enumerated; reproducible test data. |
| Z.AI (implicit) | Model provider | Responsible prompt construction; no PII leakage; reasonable token consumption. |
| (Future) Driver Associations / NGOs | Distribution partners (out of scope for MVP) | Post-hackathon expansion channel. |

---

## 7. Roles

| Role | Responsibilities | Permissions |
|------|----------------|-------------|
| Driver | Upload own earnings; set own profile; request plans; ask follow-ups; run backtests. | Full read/write on their own data (single-user MVP — no multi-tenant isolation yet). |
| Developer | Implement services, prompts, UI; maintain tests; own `.env` secrets locally. | Commit to `feature/*` branches only; never to `main` or `basic-template`. |
| QA / Reviewer | Execute test plan from QATD; file issues; verify backtest integrity. | Read-only access to data; can trigger all endpoints. |
| (Future) Admin | Curate event seed data, zone whitelist, prompt versions. | Out of scope for MVP. |

---

## 8. Changes in Major Architectural Components

This project is greenfield, but it inherits and substantially extends the `basic-template` scaffold. The table below shows the deltas.

| Component | Previous Version (basic-template) | New Version (GigShift) | Change Description |
|-----------|-----------------|-----------|-----------------|
| `backend/app/routes/api.py` | Health check + generic `/glm/predict`, `/glm/analyze`, plus a celebration-themed `/demand/forecast` | Replaces `/demand/forecast` with GigShift endpoints: `/earnings/upload`, `/profile`, `/analytics/summary`, `/external/today`, `/plan/generate`, `/plan/ask`, `/backtest/run` | Rewired to the driver domain. Keeps `/health` and generic `/glm/*` for debugging. |
| `backend/app/services/glm_service.py` | Generic `call_glm`, `call_glm_with_context`, mock fallback | Adds domain-specific `generate_plan(context)` and `ask_followup(plan, q)`; adds prompt builder module; adds plan-shaped mock output so UI is demoable without real API key | Promotes GLM from utility to named service with typed contracts. |
| `backend/app/services/` | Only `glm_service.py` | Adds `earnings_service.py`, `external_data_service.py`, `analytics_service.py`, `plan_service.py`, `backtest_service.py` | New service modules per domain concern. |
| `backend/app/models/` | Empty | Adds Pydantic models: `Trip`, `DriverProfile`, `DailySignals`, `AnalyticsSummary`, `PlanWindow`, `Plan`, `FollowupTurn` | Establishes type-safe contracts between services. |
| Persistence | None | SQLite DB (`gigshift.db`) with migrations in `backend/app/db.py` | Introduces durable storage. |
| Frontend | Single `App.jsx` with backend status + "Test Prediction" button | Multi-page: Upload, Dashboard, Plan, Backtest, Profile; uses React Router; uses Recharts for charts | Full product UI. |
| Docs | Template placeholders | Filled PRD + SAD + QATD specific to GigShift | Covered in this branch. |

---

## 9. API Documentation Reference

| Endpoint | Method | Request | Response | Description |
|----------|-------|---------|---------|-------------|
| `/api/health` | GET | — | `{ status: "ok" }` | Liveness check. Kept from template. |
| `/api/profile` | GET | — | `{ vehicle_type, fuel_type, home_zone, typical_hours, platforms: [...] }` | Fetch driver profile. Single-user MVP. |
| `/api/profile` | PUT | `{ vehicle_type, fuel_type, home_zone, typical_hours, platforms }` | `{ ok: true }` | Upsert driver profile. |
| `/api/earnings/upload` | POST | `multipart/form-data` with `platform` and `file`, or JSON `{ platform, pasted_text }` | `{ rows_inserted: N, date_range: [from, to], warnings: [...] }` | Ingest per-platform earnings. |
| `/api/analytics/summary` | GET | query: `?days=14` | `{ by_platform: [...], by_zone: [...], by_hour: [...], totals: {...} }` | Aggregated analytics for dashboard. |
| `/api/external/today` | GET | query: `?date=YYYY-MM-DD` | `{ weather, public_holidays, fuel_price_ron95, events: [...] , generated_at }` | Today's external signals (cached). |
| `/api/plan/generate` | POST | `{ window: { start: ISO, end: ISO } }` | `{ plan_id, windows: [{start, end, platform, zone, expected_nett_rm}], confidence: 0-100, reasoning, signals_used: [...], fallback_used: bool }` | Core GLM-powered plan. |
| `/api/plan/ask` | POST | `{ plan_id, question }` | `{ answer, used_signals: [...] }` | Follow-up Q&A. |
| `/api/backtest/run` | POST | `{ weeks: 1..8 }` | `{ delta_rm, delta_pct, per_day: [{date, actual_rm, if_followed_rm, delta_rm}] }` | Historical backtest. |
| `/api/glm/predict` | POST | `{ prompt }` | `{ success, result }` | **Debug-only** — raw GLM passthrough, not used by UI. |
| `/api/glm/analyze` | POST | `{ prompt, context, system_prompt }` | `{ success, result }` | **Debug-only** — raw GLM with context. |

---

## 10. External Dependencies

| Service | Purpose | API Key Required | Documentation |
|---------|---------|---------------|---------------|
| Z.AI GLM | Core reasoning engine — plan generation, follow-up Q&A, explanations | Yes (`ZAI_API_KEY` in `.env`); dev falls back to mock | https://z.ai/ (official docs provided by hackathon organisers) |
| OpenWeather | Weather forecast for shift date (temperature, rain probability, wind) | Yes (free tier, 1000 calls/day; `OPENWEATHER_API_KEY` in `.env`) | https://openweathermap.org/api |
| Calendarific (or seeded JSON) | Malaysian public holidays | Optional — if no key, uses seeded `data/holidays_my_2026.json` | https://calendarific.com |
| MOF weekly fuel price | RON95 / diesel price (seeded) | No — seeded from public weekly announcement into `data/fuel_price_my.json` | https://www.mof.gov.my |
| Events seed (KL) | Concerts / matches / expos for the demo window | No — curated `data/events_kl.json` for MVP; live APIs deferred to v2 | Internal file |
| GitHub | Source control + optional CI | No for local dev | — |

**Secret management:** All keys live in `backend/.env` (already `.gitignore`d via the template's `backend/.gitignore`). A `backend/.env.example` file enumerates required keys without values.

---

## Document Control

| Field | Detail |
|-------|--------|
| Branch | `feature/driver-copilot` |
| PRD Reference | [UMHackathon2026 Product Requirement Documentation](./UMHackathon2026%20Product%20Requirement%20Documentation.md) |
| Testing Reference | [UMHackathon2026 Testing Analysis Documentation](./UMHackathon2026%20Testing%20Analysis%20Documentation%20(Preliminary).md) |
| Version | 0.1.0 (Preliminary round) |
| Last updated | With initial commit of this document |

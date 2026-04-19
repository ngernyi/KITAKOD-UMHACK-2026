# PRODUCT REQUIREMENT DOCUMENT (PRD)
UMHackathon 2026 — Domain 2: AI for Economic Empowerment & Decision Intelligence

---

## Table of Contents

1. Project Overview
2. Background & Business Objective
3. Product Purpose
4. System Functionalities
5. User Stories & Use Cases
6. Features Included (Scope Definition)
7. Features Not Included (Scope Control)
8. Assumptions & Constraints
9. Risks & Questions Throughout Development

---

## 1. Project Overview

**Project Name:** GigShift — AI Co-Pilot for Multi-Platform E-Hailing Drivers
**Version:** 0.1.0 (Preliminary round MVP)

**Problem Statement:**
Full-time e-hailing drivers in Malaysia routinely juggle two to four platforms (Grab, AirAsia Ride, Maxim, inDrive) and make dozens of micro-decisions per day: *which app to log into, which zone to position in, when to switch, when to stop driving*. These decisions depend on weather, local events, petrol prices, day-of-week patterns and each platform's surge behaviour — far more signals than a human can process in real time. Drivers currently decide by intuition, WhatsApp chatter, and trial-and-error, leading to wasted fuel, dead-haul kilometres, and lost earnings.

**Target Domain:**
AI-powered decision intelligence for gig-economy workers — specifically, income optimisation and shift planning for e-hailing drivers operating across multiple platforms in the Klang Valley.

**Proposed Solution Summary:**
GigShift is a web application that ingests a driver's own earnings history (uploaded per platform) together with public external signals (weather, public holidays, fuel price, local events) and uses Z.AI's GLM to generate a daily "Next Shift Plan" — a concrete recommendation of **which platform to open, which zone to drive in, for which time window, with plain-language reasoning and a confidence score**. Drivers can also ask follow-up questions in natural language ("why not KLIA tonight?") and receive GLM-generated explanations that reference the underlying signals.

---

## 2. Background & Business Objective

**Background of the Problem:**
Malaysia has over 200,000 active e-hailing drivers. Industry surveys (LPKP, academic studies) consistently show that full-time drivers run multiple platforms concurrently to maximise utilisation — Grab for volume, Maxim/inDrive for higher per-trip margins, AirAsia Ride for airport runs. Each platform runs its own surge algorithm, incentive scheme, and commission structure, none of which are visible to the driver in a unified view. No platform has an economic incentive to build a cross-platform advisor; each wants exclusivity. Drivers are left to reverse-engineer patterns themselves, typically via WhatsApp/Telegram rider groups.

The decision burden is high-frequency (multiple times per shift), high-consequence (earnings differ by RM 20–50 per shift), and data-rich (petrol price, weather, events, personal history all influence the outcome) — a near-perfect fit for AI-assisted decision intelligence.

**Importance of Solving This Issue:**
- **Economic empowerment:** Gig workers are price-takers with no bargaining leverage against platforms. Giving them a decision-intelligence tool shifts a small but meaningful amount of market power back to them.
- **Quantifiable household impact:** For a full-time driver earning RM 3,500–4,500/month, a 15–20% improvement in nett earnings is RM 500–900/month — materially significant at this income level.
- **Time reclaimed:** Drivers currently spend 1–3 hours/week in group chats speculating on demand. GigShift compresses that to a 30-second daily check.
- **Waste reduction:** Less deadhead kilometres means less fuel consumption and lower carbon footprint.

**Strategic Fit / Impact:**
Aligns directly with Domain 2's mandate: *AI for Economic Empowerment & Decision Intelligence*. Z.AI's GLM is the core reasoning engine — without it, the product collapses to a dumb earnings dashboard. The system demonstrates all four required GLM capabilities:
- **Structured + unstructured data interpretation** (CSV earnings + text event descriptions + weather JSON)
- **Context-aware reasoning** (synthesising weather + events + user history + surge patterns into one action)
- **Action recommendation** (concrete "open app X, go to zone Y between time A and B")
- **Explainability** (plain-language reasoning with confidence score and invalidation conditions)

---

## 3. Product Purpose

### 3.1. Main Goal of the System

Help a multi-platform e-hailing driver answer one recurring question every shift:

> *"Right now (or at time X today), which platform should I be logged into, where in Klang Valley should I be, and why?"*

The system returns a **Next Shift Plan** — a concrete, time-sliced recommendation with plain-language reasoning, confidence score, and a list of external signals that drove the decision. The driver can accept the plan, ask follow-up questions, or override it and still log their actual earnings for the model to learn their behaviour.

### 3.2. Intended Users (Target Audience)

| User Type | Description | Use Case |
|-----------|-------------|----------|
| Full-time multi-platform driver (primary persona "Ahmad") | 25–45 y.o. driver in Klang Valley, ≥8 hours/day, logged into 2+ platforms, primary household income | Daily shift planning; deciding when/where to drive to maximise nett hourly earnings |
| Part-time driver | Full-time job holder driving evenings/weekends for supplementary income | Optimise the limited 3–5 hour window they have — where to drive after 6pm? |
| Food-delivery rider | Grab Food / Foodpanda rider on motorbike | Adjacent persona; the model can be adapted post-MVP (out of scope for preliminary) |

**Key Benefits:**
- **Benefit 1:** Expected +15–25% increase in nett earnings per shift through better platform + zone selection (measured via backtest on driver's own history).
- **Benefit 2:** Expected −20% in deadhead kilometres and fuel cost by avoiding low-demand zones.
- **Benefit 3:** ~2 hours/week of planning time reclaimed — the AI synthesises signals the driver would otherwise skim manually across multiple chat groups and apps.
- **Benefit 4:** Decision transparency — every recommendation comes with a plain-language explanation and confidence score, so the driver can calibrate trust rather than being asked to blindly follow a black box.

---

## 4. System Functionalities

### 4.1. Description

GigShift operates as an **AI decision-support layer that sits on top of a driver's own data and public external signals**. The driver uploads per-platform earnings (CSV / pasted text). The backend normalises this into a common schema and augments it with external data (weather, fuel price, events, holidays). On request, the backend constructs a structured prompt — containing the driver's recent history summary plus today's external signals — and calls Z.AI GLM. The GLM returns a structured recommendation (platform, zone, time window) along with reasoning text and confidence. The frontend renders this as a "Next Shift Plan" card with drill-down panels for the underlying data, and a conversational input for follow-up questions.

### 4.2. Key Functionalities

| Functionality | Description | Priority |
|--------------|-------------|----------|
| Per-platform earnings ingest | Driver uploads/pastes weekly earnings from each platform; system normalises to common schema | High |
| Driver profile setup | One-time input: vehicle type, fuel type, usual availability, home zone | High |
| External data fetcher | Pulls weather, public holidays, fuel price, and seeded events for the shift date | High |
| Historical pattern analysis | Computes per-zone, per-hour, per-platform nett earnings from driver's own data | High |
| **GLM-powered Next Shift Plan generation** | Core feature — GLM synthesises all signals into time-sliced plan with reasoning + confidence | High |
| **GLM-powered follow-up Q&A** | Conversational layer — driver asks "why not X?" and GLM answers using the same context | High |
| Backtest / impact report | Replays driver's historical days and shows "if you'd followed GigShift, you'd have earned +RM N" | High |
| External data dashboard | Transparency panel showing exactly which external signals were fetched today | Medium |
| Earnings history visualisation | Charts of past earnings by platform, zone, hour-of-day | Medium |
| Plan export / share | Copy the plan as text (so driver can paste in their own notes/WhatsApp) | Low |

### 4.3. AI Model & Prompt Design

#### 4.3.1. Model Selection

**Model Used:** Z.AI GLM (General Language Model)

**Justification:** The core task is not a simple classification or a math problem — it is a **multi-signal reasoning task** that requires synthesising heterogeneous inputs (numeric history, weather text, event descriptions, fuel prices) and producing a structured recommendation **plus** a human-readable explanation. Traditional ML (regression, gradient boosting) can predict a number but cannot explain itself in natural language or handle unstructured inputs like a textual event description. Z.AI GLM is purpose-built for exactly this combination of **context-aware reasoning + explainability + structured output** that Domain 2 mandates. If GLM is removed, the product degrades to a dashboard — recommendations and explanations become impossible.

#### 4.3.2. Prompting Strategy

| Strategy | Description | Justification |
|----------|-------------|-------------|
| Multi-step structured prompting with system instructions + few-shot examples | A fixed system prompt defines the role ("You are a driver income advisor..."), the required JSON output schema, and constraints (conservative recommendations, cite signals). The user-turn prompt contains the day's signals and history summary. 2–3 few-shot examples demonstrate the expected reasoning depth and JSON format. | We need *deterministic output shape* (for UI rendering) plus *flexible reasoning content*. Few-shot fixes format drift; system prompt fixes role drift; structured JSON output makes parsing robust. |
| Conversational follow-up with rolling context | Follow-up questions re-use the same system prompt but append the prior plan as assistant-turn context, then the driver's question as user-turn. | Preserves coherence — the AI's "why not KLIA?" answer must be consistent with its earlier recommendation. |

**Approach:** The backend is the sole constructor of prompts — the frontend never sends raw prompts. This is critical for safety (prompt injection), consistency (all users get the same prompting logic), and tunability (we iterate on prompts in one place). Every GLM call specifies the JSON schema it must return; the `parse_json_response` helper (already present in the template's `glm_service.py`) extracts the JSON block.

#### 4.3.3. Context & Input Handling

| Parameter | Value |
|-----------|-------|
| Maximum Input Size | ~6,000 tokens per prompt (system + few-shot + history summary + external signals) |
| Handling Method | **Summarisation + chunking.** Raw earnings CSV never enters the prompt; Python pre-computes per-zone/per-hour aggregates and injects summaries. |
| Overflow Behavior | If summary still overflows, the oldest week of history is dropped first. The most recent 14 days are always preserved as they are most predictive. |

**Input Size Limits:**
- Text follow-up question: 500 characters
- CSV upload: 2 MB (≈ ~6 months of per-trip records for a full-time driver)
- API Request body: 5 MB (safety margin)

#### 4.3.4. Fallback & Failure Behavior

| Scenario | Behavior |
|----------|----------|
| Off-topic response (e.g., GLM refuses or rambles) | Response parser detects missing required JSON keys → retry once with a corrective system message. If still failing, show "Recommendation unavailable, using fallback from historical averages" and surface the driver's own best historical platform+zone. |
| Unusable / invalid JSON | `parse_json_response` falls back to regex extraction; if still invalid, treat as fallback case above. |
| API timeout (>30s) | Single retry with exponential backoff. On second failure → fallback card. |
| Rate limiting | Client-side throttling: max 1 plan generation per 60s per user; follow-up Q&A max 5 per minute. Server returns 429 with friendly message. |
| Model unavailable / API key missing | `glm_service.py` already returns mock responses (see template). During development this is the default; in production we surface "AI advisor temporarily offline — showing historical best" and render the fallback card. |
| External API (weather/events) failure | Plan is still generated but with a visible "Weather data unavailable today" badge; confidence score is reduced. The GLM is told which signals are missing so its reasoning accounts for it. |

---

## 5. User Stories & Use Cases

### User Story Template

> As a **[type of user]**, I want **[goal]** so that **[benefit]**.

### User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-001 | As a full-time multi-platform driver, I want to upload my weekly earnings from each platform in one place, so that I have a unified view of where my income is actually coming from. | High |
| US-002 | As a driver about to start my shift, I want a clear recommendation of which platform to open and which zone to drive toward, so that I don't waste the first hour guessing. | High |
| US-003 | As a skeptical driver, I want to see the plain-language reasoning behind any recommendation plus a confidence score, so that I can decide whether to trust it today. | High |
| US-004 | As a driver with a specific concern ("why not KLIA?"), I want to ask follow-up questions in natural language, so that the advice feels like a conversation rather than a dictate. | High |
| US-005 | As a results-driven driver, I want a weekly backtest showing how much more I'd have earned by following GigShift's past advice, so that I can calibrate whether the system is actually working. | High |
| US-006 | As a driver concerned about privacy, I want my earnings data to stay on my device / my account and not be shared with platforms, so that I don't risk retaliation. | Medium |
| US-007 | As a part-time driver with a tight evening window, I want to enter my availability ("5pm–10pm today") and get a plan scoped to just that window, so that the advice is realistic for me. | Medium |
| US-008 | As a driver in bad weather, I want the system to tell me when not driving is the better economic choice today, so that I don't chase sunk costs. | Medium |

### Use Cases

| Use Case ID | Description | Actor | Pre-condition | Post-condition | Steps |
|-------------|-------------|-------|----------------|----------------|-------|
| UC-001 | Generate today's Next Shift Plan | Driver | Driver has uploaded at least 2 weeks of earnings from at least 1 platform; profile is complete | Driver views a time-sliced plan with reasoning and confidence | 1. Driver clicks "Plan my shift"; 2. System prompts for availability window; 3. Backend fetches external signals; 4. Backend builds history summary; 5. Backend calls GLM with full context; 6. GLM returns structured plan; 7. Frontend renders plan card. |
| UC-002 | Ask a follow-up question | Driver | A plan has just been generated in this session | GLM returns reasoning answer referencing the same signals | 1. Driver types question in chat input; 2. Backend re-uses the plan's context + question; 3. Backend calls GLM; 4. Frontend appends answer below the plan card. |
| UC-003 | Upload new earnings data | Driver | Driver has the CSV/text from their platform | Earnings are normalised and stored; dashboard updates | 1. Driver selects platform; 2. Uploads CSV or pastes text; 3. Backend parses + normalises; 4. System confirms row count and date range. |
| UC-004 | Run weekly backtest | Driver | At least 1 week of historical data + 1 week of logged actual choices | Driver sees RM delta of "followed plan vs actual" | 1. Driver opens Backtest tab; 2. System replays each day's plan against actuals; 3. Shows aggregate delta + per-day breakdown. |
| UC-005 | Set / update driver profile | Driver | First-time user or profile change | Profile saved; used in all future plans | 1. Driver opens Profile; 2. Enters vehicle type, fuel type, home zone, typical hours; 3. Saves. |

---

## 6. Features Included (Scope Definition)

| Feature | Description | Deliverable | Priority |
|---------|-------------|--------------|----------|
| Multi-platform earnings ingest | CSV upload + paste-text fallback for Grab, AirAsia Ride, Maxim, inDrive | `/api/earnings/upload` endpoint + normalisation module + Upload page | High |
| Driver profile | Vehicle type, fuel type, home zone, typical availability | `/api/profile` endpoints + Profile page | High |
| External data service | Fetches weather (OpenWeather), public holidays (seeded or API), petrol price (seeded from MOF weekly), events (seeded JSON for MVP) | `external_data_service.py` + `/api/external/today` | High |
| Historical analytics | Per-zone / per-hour / per-platform nett earnings computed from driver data | `analytics_service.py` + `/api/analytics/summary` | High |
| **Next Shift Plan (GLM)** | Core GLM-powered recommendation with JSON-structured output | `plan_service.py` + `/api/plan/generate` | High |
| **Follow-up Q&A (GLM)** | Conversational layer re-using plan context | `/api/plan/ask` | High |
| Backtest report | Replay historical days; show cumulative RM delta | `/api/backtest/run` + Backtest page | High |
| Plan card UI | Time-sliced visual plan with reasoning, confidence, signal chips | React component: `PlanCard.jsx` | High |
| External Data panel | Transparency view of today's fetched signals | React component: `ExternalDataPanel.jsx` | Medium |
| Earnings dashboard | Charts by platform/zone/hour (Recharts) | `Dashboard.jsx` | Medium |
| Mock-mode GLM | Sensible mock responses when API key absent | Already in `glm_service.py`; extend with plan-shaped mock | High (dev-essential) |

---

## 7. Features Not Included (Scope Control)

| Feature | Reason for Exclusion | Phase |
|---------|-------------------|-------|
| Direct Grab / Maxim / AirAsia Ride / inDrive API integration | Platforms do not offer public APIs for driver data; scraping violates ToS. User-upload is legal and demo-viable. | v2 (partnership or official integrations only) |
| Automated actions inside third-party apps | Violates platform ToS; unnecessary for decision-support value proposition | Never |
| Mobile native app (iOS/Android) | Web-responsive is sufficient for MVP; native requires separate build pipelines | v2 |
| Multi-city support | Each city has unique zones, events, patterns. Klang Valley is enough for 1-week MVP. | v2 (Penang, JB next) |
| User authentication + multi-user accounts | Adds 1–2 days of auth/session/DB work with no value for preliminary-round demo. Single-user local state. | Semi-final / final round |
| Live event feeds | Real-time concert/match/traffic APIs are rate-limited and costly. MVP uses curated seeded JSON for demo. | v2 |
| Food-delivery rider persona | Adjacent but requires its own data model (bike economics, parcel density). Validate driver persona first. | v2 |
| Revenue-share / premium tier | Business model is out of scope for a hackathon technical submission | Post-competition |
| Offline mode / PWA caching | Drivers have internet on shift; not a blocker | v2 |
| Notification / push alerts ("switch to Grab now") | Requires backend scheduler + user-side service worker; out of scope for MVP | v2 |

---

## 8. Assumptions & Constraints

| Type | Description |
|------|-------------|
| Assumption | Drivers have internet connectivity on shift (reasonable — they use ride-hailing apps constantly). |
| Assumption | Drivers can provide at minimum 2 weeks of per-platform earnings data (either CSV from platform or manual paste). For MVP demo, we will use a realistic **synthetic dataset** labelled clearly as simulated. |
| Assumption | Drivers can read English or basic Bahasa Malaysia (MVP UI is English; BM i18n is v2). |
| Assumption | Z.AI GLM can be prompted to return valid JSON in ≥ 95% of calls with few-shot examples + JSON schema instruction. (Falls back to regex extraction otherwise.) |
| Assumption | Public external data sources (weather, MOF fuel price, public holidays) remain freely accessible for the demo period. |
| Constraint | **Submission deadline:** Preliminary round — end of next week (6 calendar days from project start). This forces scope cuts. |
| Constraint | **Single developer:** scope assumes one primary contributor. |
| Constraint | **No API key for Z.AI GLM at project start** — development proceeds against `glm_service.py`'s mock response path; real key is swapped in via `.env` once obtained. |
| Constraint | **Response time target:** Plan generation ≤ 10 s p95 (acceptable because users don't generate plans constantly); follow-up Q&A ≤ 6 s p95. |
| Constraint | **No scraping** of any e-hailing platform. All internal data is user-uploaded. |
| Constraint | **No medical / legal / tax advice** — the product is strictly an income-decision advisor. |
| Constraint | **Frontend must run** on modern Chromium / Firefox / Safari — no IE support. |

---

## 9. Risks & Questions Throughout Development

| Risk/Question | Impact | Mitigation | Status |
|---------------|--------|------------|-------|
| No real driver available to supply a genuine month of multi-platform earnings data | High | Generate a realistic synthetic dataset with plausible patterns (Friday night peak, rainy-day slump, airport surge). Clearly label "simulated data" in demo. Retain ability to ingest real data when available. | Open |
| Z.AI GLM API key not yet provisioned | Medium | `glm_service.py` already returns mocks when key absent. Extend mocks to return a plan-shaped JSON so the whole UI is demoable without the real API. | Open |
| GLM returns malformed JSON | Medium | Use `parse_json_response` with regex fallback; additionally, corrective retry on missing keys; final fallback to deterministic "best historical" card. | Mitigated (design) |
| External APIs rate-limited during demo | Low | Cache last successful response for 24h; seed fallback JSON for events; OpenWeather free tier is generous (1000 calls/day). | Mitigated (design) |
| Scope creep — "let's add food riders too" | High | This PRD explicitly excludes it. Revisit after preliminary round only. | Mitigated (PRD) |
| Reasoning quality is hard to evaluate objectively | Medium | Testing doc defines qualitative rubric (references ≥ 3 signals, no contradiction with data, plain language) and quantitative guardrails (JSON schema compliance, latency). | Open (→ Testing doc) |
| GLM hallucinates non-existent zones or events | High | Whitelist of known Klang Valley zones injected into system prompt; GLM is instructed to only recommend zones from the whitelist. Events are provided explicitly in context — GLM cannot invent events it wasn't told about. | Mitigated (design) |
| Legal / ToS concerns around advising gig workers | Low | We are purely advisory; never automate any action on a third-party platform. Disclaimer in UI: "Advisory only — your judgement prevails." | Mitigated (design) |
| Judges question the "quantifiable impact" claim | High | Backtest feature produces a concrete RM-delta number on the user's own data, not a general marketing claim. Synthetic-data backtest shows the same methodology. | Mitigated (feature design) |
| Question: Do Malaysian drivers actually run multiple platforms? | - | Corroborated by LPKP reports and driver forum sentiment. For the final round, we would interview 5+ drivers to validate. For preliminary, we rely on desk research. | Answered (sufficient for MVP) |
| Question: Is the cost of GLM API calls sustainable at scale? | - | Each plan generation is ~6k tokens in, ~1k out. At published Z.AI pricing, <RM 0.05 per plan. One plan per driver per shift → <RM 2/driver/month. Sustainable even at free-tier for users. | Answered |

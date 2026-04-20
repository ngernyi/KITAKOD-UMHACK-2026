# GigShift — Documentation

**Branch:** `feature/driver-copilot`
**Hackathon:** UMHackathon 2026 — Domain 2: AI for Economic Empowerment & Decision Intelligence
**Status:** Preliminary round — documentation complete, implementation in progress

---

## 1. What is GigShift?

> **GigShift is an AI co-pilot that tells a multi-platform e-hailing driver which app to open, where in Klang Valley to drive, and why — before each shift.**

It is not a ride-hailing platform. It is not a scraper. It is a **driver-side decision-intelligence tool** that sits on top of a driver's own earnings history plus publicly-available external signals (weather, public holidays, fuel price, local events) and uses **Z.AI's GLM** to produce a time-sliced "Next Shift Plan" with plain-language reasoning and a confidence score.

### 1.1 The one sentence version

> "For the next 4 hours, open Maxim and position near Sunway Pyramid; at 7:30pm switch to Grab and move toward Bangsar — here's why, with 72% confidence."

---

## 2. Why this problem, and why now?

### 2.1 The decision is real, recurring, and invisible

Malaysia has 200,000+ active e-hailing drivers. **Full-time drivers routinely run 2–4 platforms simultaneously** — Grab for volume, Maxim / inDrive for higher per-trip margins, AirAsia Ride for airport runs. Each platform has its own surge algorithm, commission structure, and incentive scheme, none visible in a unified view.

Every shift, a driver makes dozens of micro-decisions:

- Which app should I open right now?
- Is it worth driving to KLIA tonight?
- Should I wait for surge, or take the flat booking?
- Is the weather bad enough that I should stop driving?

These decisions are **high-frequency**, **high-consequence** (RM 20–50 difference per shift), and **data-rich** — but no single platform has an economic incentive to build a cross-platform advisor. They each want exclusivity.

### 2.2 The current workaround is painful and wasteful

Drivers currently decide via:
- Gut feel and memory of "last Tuesday at 6pm"
- WhatsApp / Telegram rider group chatter
- Trial and error (burning fuel in dead zones)

The result: wasted fuel, deadhead kilometres, and lost earnings — each of which directly reduces household income for a group of workers who typically earn RM 3,500–4,500/month.

### 2.3 Why AI — specifically a GLM — is the right tool

Simple ML (gradient boosting, regression) can *predict a number*. It cannot:

1. Read unstructured signals (event descriptions, weather conditions, news) alongside structured trip data.
2. **Explain itself** in the driver's own language, with a confidence score.
3. Answer the follow-up question — *"why not KLIA tonight?"* — coherently with its own earlier recommendation.

Z.AI's GLM is the only component in our stack that can do these three things simultaneously. **Remove it and GigShift collapses into a dumb earnings dashboard.** This is the "load-bearing GLM" requirement from Domain 2's judging rubric — met by design, not by decoration.

---

## 3. The primary persona

Every design decision checks against one person:

> **"Ahmad, 32, full-time e-hailing driver in Klang Valley, drives ~10 hrs/day, actively switches between Grab + AirAsia Ride + Maxim + inDrive, uses petrol motorbike or Proton Saga. Household income RM 3,500–4,500/month."**

If a feature doesn't help Ahmad make a better shift decision today, it doesn't ship this week.

---

## 4. The core loop (what the product actually does)

```
                                  ┌────────────────────────┐
 Driver uploads per-platform      │                        │
 earnings (CSV / paste text)  ──▶ │   Earnings Service     │
                                  │   (normalise → DB)     │
                                  └───────────┬────────────┘
                                              │
                                              ▼
 External APIs (cached 24h)       ┌────────────────────────┐
 - OpenWeather                    │                        │
 - Public holidays API            │   External Data        │
 - MOF fuel price (seeded)   ──▶  │   Service              │
 - Seeded KL events               │                        │
                                  └───────────┬────────────┘
                                              │
                                              ▼
 Analytics Service computes       ┌────────────────────────┐
 per-zone / per-hour /           │                        │
 per-platform summaries      ──▶ │   Plan Service         │
 from the driver's own data      │   (orchestrator)       │
                                  └───────────┬────────────┘
                                              │
                                              ▼
                                   ┌──────────────────────────┐
                                   │    Z.AI GLM Service      │
                                   │  (load-bearing reasoning)│
                                   │                          │
                                   │  - builds typed prompt   │
                                   │  - enforces JSON schema  │
                                   │  - corrective retry      │
                                   │  - deterministic fallback│
                                   └───────────┬──────────────┘
                                               │
                                               ▼
                                   ┌──────────────────────────┐
                                   │   Next Shift Plan        │
                                   │                          │
                                   │  - time-sliced windows   │
                                   │  - platform + zone       │
                                   │  - plain reasoning       │
                                   │  - confidence score      │
                                   │  - signals_used[]        │
                                   └──────────────────────────┘
```

Follow-up Q&A ("why not KLIA tonight?") re-uses the same context and adds the prior plan as assistant-turn history — guaranteeing coherent answers that cannot contradict the plan.

---

## 5. Quantifiable impact (the judging criterion)

We do **not** make marketing claims. We make claims that are re-runnable on the driver's own data.

| Metric | Target | How we prove it |
|---|---|---|
| Nett earnings per shift | **+15–25%** vs. the driver's baseline | **Backtest:** replay last 4 weeks of the driver's own days through the Plan Service; compare recommended platform+zone to the actual highest-earning platform+zone that day; aggregate RM delta. |
| Deadhead kilometres (wasted fuel) | **−20%** | Distance-weighted zone recommendation vs. actual driven distance from trip records. |
| Planning time per week | **~2 hours → ~5 minutes** | Qualitative claim backed by the current workflow (scanning 2–3 WhatsApp groups + checking weather + guessing). |
| Decision transparency | **Every recommendation has ≥ 3 cited signals + confidence score** | Enforced by Pydantic schema validation on GLM output. |

The **Backtest page** is the single most important UI surface for judges — it converts a narrative claim into a specific RM number on data they can watch us load.

---

## 6. Scope — what is NOT in this project

Explicit anti-features, in priority order:

1. **We do NOT scrape Grab / AirAsia Ride / Maxim / inDrive.** Platforms do not offer public driver-data APIs. User uploads their own data. This is the same legal basis as apps like Gridwise or Para in the US market.
2. **We do NOT automate actions inside any third-party app.** GigShift is strictly advisory.
3. **We do NOT offer tax, legal, or financial advice.** Income optimisation only.
4. **We do NOT ship multi-city for preliminary round.** Klang Valley only.
5. **We do NOT ship a native mobile app.** Web-responsive only.
6. **We do NOT ship multi-user auth for preliminary round.** Single-user MVP.

See the PRD §7 for the full list and rationale.

---

## 7. Folder structure

```
documentation/
├── README.md                                                        <-- you are here
│
├── UMHackathon2026 Product Requirement Documentation.md             <-- PRD (source of truth)
├── UMHackathon2026 Product Requirement Documentation.docx
│
├── UMHackathon2026 System Analysis Documentation.md                 <-- SAD (architecture)
├── UMHackathon2026 System Analysis Documentation.docx
│
├── UMHackathon2026 Testing Analysis Documentation (Preliminary).md  <-- QATD (test plan)
├── UMHackathon2026 Testing Analysis Documentation (Preliminary).docx
│
└── sample/                                                          <-- template reference only
    ├── Domain 2_AI for Economic Empowerment & Decision Intelligence.docx
    ├── Domain_2_description.md
    ├── UMHackathon2026 Product Requirement Documentation (Sample).docx
    ├── UMHakcathon2026 Sample Testing Analysis Documentation (Preliminary).docx
    ├── UMHakcathon2026 System Analysis Documentation (Sample).docx
    └── ideas/
        └── celebration-demand-intelligence.md                       <-- the scaffold's example idea (not ours)
```

### 7.1 How the three main docs relate

This is the "three-legged stool" of engineering documentation. Every requirement lives on all three legs:

- **PRD** answers **What** and **Why** — scope, users, features, assumptions, risks.
- **SAD** answers **How technically** — architecture, services, API contracts, data flows, prompt design.
- **QATD** answers **How do we prove it works** — risk matrix, traceability matrix, test cases, release gates.

Every row in the PRD's feature table maps to a component in the SAD and a test case in the QATD.

### 7.2 Regenerating the .docx files

The `.docx` files are generated from the `.md` sources via pandoc. Do not edit `.docx` directly — edit the `.md` and regenerate:

```bash
pip install pypandoc-binary         # one-time (bundles pandoc 3.9)
python scripts/md_to_docx.py        # regenerates all three .docx
```

---

## 8. Reading order for a new reviewer

If you have 5 minutes: read this README.
If you have 15 minutes: read this README + the PRD §§ 1–4.
If you have 45 minutes: read all three main docs in the order PRD → SAD → QATD.
If you are reviewing for the judging rubric: jump to PRD §3 (Product Purpose), PRD §4.3 (AI Model & Prompt Design), SAD §3.2 (GLM as Service Layer), and QATD §5 (Test Cases) — these four sections collectively cover every rubric item.

---

## 9. What lives outside this folder

- **Backend implementation:** `backend/` — Flask service, GLM integration, data services. Runs on `http://localhost:5000`.
- **Frontend implementation:** `frontend/` — React + Vite SPA. Runs on `http://localhost:5173`.
- **Conversion utility:** `scripts/md_to_docx.py` — regenerates the `.docx` files from `.md`.
- **AI Assistant instructions:** `AI_INSTRUCTIONS.md` (in repo root) — onboarding notes for any AI pair programmer opening this branch.

---

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-04-19 | Initial documentation set for GigShift MVP: PRD, SAD, QATD committed. Documentation folder reorganised (samples moved to `sample/`). README created. |

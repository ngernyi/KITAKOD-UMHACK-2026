# SME Business Demand Intelligence System

## Project Overview

**Domain:** AI for Economic Empowerment & Decision Intelligence

**Problem Statement:** SME owners (specifically mini markets/kedai runcit) struggle to predict daily demand - leading to overstocking (wasted capital) or stockouts (lost sales). They have sales data but no time to analyze it, and miss external signals (trends, holidays, weather) that affect demand.

**Target Users:** SMEs - Mini markets, convenience stores, small retail shops

**Example Industry Focus:** Mini Market (Kedai Runcit)

---

## Core Problem

SMEs have historical data (sales, expenses) but:
- Don't have time to analyze it properly
- Cannot process multiple variables simultaneously (trends, holidays, weather)
- Miss non-obvious patterns humans can't detect
- No way to know what's trending in the market

**Why AI?** AI connects internal SME data with external signals (Google Trends, weather, holidays) to generate predictions and recommendations no human could process manually.

---

## Solution Design

### Data Architecture

```
INPUT DATA
├── INTERNAL DATA (from SME):
│   ├── Sales (date, item, quantity, revenue)
│   ├── Expenses (date, category, amount)
│   ├── Products (name, category, cost, price)
│   ├── Inventory (item, quantity, unit)
│   └── Customers (segment, freq, avg spend)
│
└── EXTERNAL DATA (auto-fetched):
    ├── Public/School holidays calendar
    ├── Google Trends (search popularity)
    ├── Weather forecast
    └── Industry benchmarks
        │
        ▼
    Z.AI GLM ENGINE
        │
        ▼
OUTPUTS (4 Categories):
    ├── 1. Data Analysis (charts, graphs)
    ├── 2. Predictions (forecasts)
    ├── 3. Action Suggestions (recommendations)
    └── 4. AI Assumptions (what-if, ask AI)
```

---

## Input Tiers

### Internal Data Tiers

| Tier | Data Types | Fields | Example |
|------|------------|--------|---------|
| **Basic** | Sales | date, item, quantity, price | 2026-04-19, Milo 50g, 10, RM5.00 |
| | Expenses | date, category, amount | 2026-04-01, Rent, RM1500 |
| **Intermediate** | Products | name, category, cost, price, supplier | Milo 50g, Beverages, RM3.50, RM5.00, GCH |
| | Inventory | item, quantity, unit, reorder_level | Milo 50g, 45, pack, 20 |
| | Customers | segment, visit_freq, avg_spend | Regular, daily, RM15 |
| **Advanced** | Staff | role, count, wage, hours | Cashier, 2, RM1500, 10hrs |
| | Suppliers | name, lead_time, terms | GCH, 2 days, net30 |
| | Marketing | channel, campaign, spend | WhatsApp, Ramadan, RM200 |
| | Pricing History | date, item, old_price, new_price | Milo, 2026-01-01, RM4.50, RM5.00 |

### External Data Tiers

| Tier | Data Sources | Auto-fetch? |
|------|--------------|-------------|
| **Basic** | Calendar (public holidays) | ✅ Auto |
| | School holidays | ✅ Auto |
| **Intermediate** | Google Trends | ✅ Auto |
| | Weather forecast | ✅ Auto |
| | Industry benchmarks | ✅ Auto |
| **Advanced** | Competitor data | Manual |
| | Economic indicators | ✅ Auto |
| | Custom API | Manual config |

---

## Output Categories & Tiers

### 1. Data Analysis (Descriptive - "what happened")

| Tier | Outputs | Example |
|------|---------|---------|
| **Basic** | Sales trend chart | Line chart: daily sales last 30 days |
| | Expense trend chart | Bar chart: monthly expenses |
| | MoM comparison | "This month: +15% vs last month" |
| | Top products chart | Bar chart: top 5 items |
| | Low sales alert | "Tuesday sales 40% below avg" |
| | Quick stats | Today's total, profit margin |
| **Intermediate** | Revenue vs expense chart | Combined trend showing profit |
| | Margin by product | "Milo: 30%, Maggi: 25%" |
| | Seasonality detection | "Ramadan sales always +45%" |
| | Growth rate | "+12% YoY" |
| **Advanced** | Custom date range | Any period selection |
| | Export reports | PDF/CSV download |

### 2. Predictions (Predictive - "what will happen")

| Tier | Outputs | Example |
|------|---------|---------|
| **Basic** | 7-day forecast | "Tomorrow: RM350-400" |
| **Intermediate** | 30-day forecast | "May 25th peak: +40%" |
| | Seasonality forecast | "Ramadan: +45% expected" |
| | Trend direction | "Sales trending up ✅" |
| **Advanced** | Custom period | Any day/week/month forecast |
| | Multiple scenario | Best/worst/average case |

### 3. Action Suggestions (Prescriptive - "what should we do")

| Tier | Outputs | Example |
|------|---------|---------|
| **Basic** | Low inventory alert | "Milo low - reorder tomorrow" |
| | Low sales day alert | "Tuesday always low" |
| **Intermediate** | Margin recommendations | "Milo: 30% margin - sell more" |
| | Restock timing | "Order Milo by Friday" |
| | Pricing suggestions | "Consider raise prices on Milo" |
| | Promo suggestions | "Run Tuesday promo" |
| | **Trending item alert** | "Nescafe search +85% - consider stocking" |
| **Advanced** | AI-powered actions | Prioritized task list |
| | Full recommendations | Complete action plan |

### 4. AI Assumptions (Generative - "what could happen")

| Tier | Outputs | Example |
|------|---------|---------|
| **Basic** | - | Not available |
| **Intermediate** | - | Not available |
| **Advanced** | What-if analysis | "If raise prices 10%: profit +RM800/month?" |
| | Ask AI | "Why are sales dropping?" |
| | Cash flow projection | "Will stay cash positive next 30 days?" |
| | Scenario compare | "Restock now vs wait - pros/cons?" |

---

## Tier Mapping Summary

| Category | Basic | Intermediate | Advanced |
|----------|-------|--------------|----------|
| Data Analysis | ✅ | ✅ | ✅ |
| Predictions | 7-day | 30-day | Custom + scenarios |
| Action Suggestions | Alerts | Recommendations | AI actions |
| AI Assumptions | ❌ | ❌ | ✅ What-if + Ask |

---

## Real Example Flow (Mini Market)

```
INPUT (Basic):
- Sales: today sold Milo(10), Maggi(8), Power(5), Biscuit(12)
- Expenses: rent RM1500, restock RM800

OUTPUT:
├── Data Analysis
│   ├── Today's sales: RM320
│   ├── MoM: +15% vs last month
│   └── Top item: Biscuit (12 sold)
├── Predictions
│   ├── Tomorrow: RM350-400
│   └── Trend: 📈 Up
├── Action Suggestions
│   ├── Alert: Tuesday sales -40% (plan promo)
│   ├── Alert: Milo reorder level reached
│   └── New trend: "Nescafe" search +85% (consider stocking)
└── AI Assumptions (Advanced)
    ├── What-if raise prices 10%: +RM800/month profit?
    └── Ask: Why are Sunday sales lower?
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Dual Data Sources** | Internal (SME-provided) + External (auto-fetched) |
| **External Data Dashboard** | Visible external signals (trends, weather, holidays) |
| **4-Category Output** | Analysis, Predictions, Actions, AI - clear separation |
| **Tier System** | Basic/Intermediate/Advanced - scales with data |
| **Trending Alerts** | NEW: Detect items gaining trend popularity |
| **Explainable AI** | Every prediction includes plain-language explanation |
| **What-if Analysis** | Ask hypothetical questions |
| **Action Checklist** | Concrete actionable tasks |

---

## Unique Selling Point

| Without AI | With AI |
|-----------|---------|
| "Based on yesterday: sold 10" | "Tomorrow: predict 12 (+20%), trending now" |
| Manual analysis only | Internal + external signals combined |
| Generic recommendation | Specific: "Stock 30% more Milo - trending +85%" |
| No trend awareness | New item alert: Nescafe search +85% |

**Value Proposition:** AI connects your data with market trends and external signals you don't have time to track, delivering actionable insights, not just numbers.

---

## Quantifiable Impact

- Reduce stockouts through demand prediction
- Reduce overstocking through accurate forecasting
- Save planning time from hours to minutes
- Increase sales by catching trending items early
- Data-driven decisions vs gut feeling

---

## Feature Breakdown Summary

| Module | Details |
|--------|---------|
| **Input System** | Flexible tiers - Basic to Advanced |
| **External Data Fetch** | Auto-fetch: Trends, Weather, Holidays |
| **4-Category Output** | Clear separation of output types |
| **Tier Mapping** | Basic/Intermediate/Advanced |
| **Prediction Engine** | Z.AI GLM for analysis + insights |
| **What-if AI** | Advanced generative queries |

---

## Implementation Notes

- System supports tier-based access - more data = more outputs
- External data auto-fetches from day 1 (Basic tier)
- Trending alerts use Google Trends - shows new items gaining popularity
- Z.AI GLM serves as core engine for all 4 output categories
- If GLM removed, only basic analysis remains (no predictions, actions, AI)
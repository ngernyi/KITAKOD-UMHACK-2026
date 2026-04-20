# Celebration Demand Intelligence System

## Project Overview

**Domain:** AI for Economic Empowerment & Decision Intelligence

**Problem Statement:** SME owners in food/hospitality sector struggle to predict demand during celebration seasons - leading to food waste (over-preparation) or lost sales (under-preparation).

**Target Users:** SMEs in food/hospitality (bakeries, caterers, restaurants, supermarkets, florists)

---

## Core Problem

SMEs have historical data (sales, inventory, staff, costs) but:
- Don't have time to analyze it properly
- Cannot process multiple variables simultaneously (weather, trends, holidays)
- Miss non-obvious patterns humans can't detect

**Why AI?** AI connects internal SME data with external signals (Google Trends, weather, holidays) to generate predictions no human could process manually.

---

## Solution Design

### Data Architecture

```
INPUT DATA
├── INTERNAL DATA (from SME):
│   ├── Sales history (past 1-3 years)
│   ├── Inventory records
│   ├── Staff count & costs
│   ├── Pricing history
│   └── Product list
│
└── EXTERNAL DATA (auto-fetched):
    ├── Google Trends (search popularity for celebration items)
    ├── Weather forecast
    ├── School/Public holiday calendar
    └── Industry benchmarks
        │
        ▼
    Z.AI GLM ENGINE
        │
        ▼
OUTPUTS (Dashboard)
    ├── Demand Forecast per Celebration
    ├── Inventory Recommendations
    ├── Action Checklist (buy, hire, promote)
    └── Explanation with confidence scores
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Auto Prediction** | System runs automatically on scheduled basis (weekly/monthly) |
| **Dual Data Sources** | Internal (SME-provided) + External (API-fetched) |
| **External Data Dashboard** | Dedicated section showing fetched external signals (trends, weather, holidays) |
| **Explainable AI** | Every prediction includes plain-language explanation + confidence % |
| **Action Checklist** | Concrete actionable items: "Order 50kg flour by Tuesday", "Hire 2 extra staff for Raya week" |
| **Multi-Celebration** | Covers ALL celebrations: Raya, CNY, Deepavali, Christmas, Weddings |

### User Interface

- **Dashboard with Visualizations** - Charts and graphs showing predictions
- **External Data Section** - Shows what external signals were fetched and analyzed
- **Action-Oriented Output** - Predictions delivered as concrete action items, not just numbers

---

## Multi-Celebration Approach

This solution covers ALL celebrations, not just one religion or ethnic group:

| Business Type | Raya | CNY | Deepavali | Christmas | Weddings |
|--------------|------|-----|-----------|-----------|----------|
| Bakeries | Raya cookies | Pineapple tarts | Karpooram | Christmas logs | Wedding cakes |
| Supermarkets | Ketupat, lemang | Reunion dinner | Sweets, lamps | Hamper items | Wedding supplies |
| Caterers | Open house | Reunion dinner | Deepavali feast | Christmas party | Wedding banquets |
| Florists | Ketupat decor | Orange blossoms | Oil lamps | Poinsettias | Wedding flowers |

**Example Use Case - Bakeries:**
- Same business makes different products for each celebration
- Same suppliers (flour, sugar, eggs, nuts) needed across all seasons
- Same staff handles peak seasons
- Must predict which cookies/sweets to make in what quantity

---

## Unique Selling Point (Differentiation)

| Without AI | With AI |
|-----------|---------|
| "Based on your 2023 sales: 1000 cookies" | "Search interest for 'ketupat' up 340%, school holidays on Rayaday, weather forecast clear → Predict 1,450 cookies (+45%)" |
| Manual analysis of own data only | Combines internal data + 10+ external data sources |
| Generic estimation | Celebrationspecific prediction with confidence score |

**Value Proposition:** AI doesn't just analyze what you have - it connects your data with external signals you don't have time to track, combining multiple data sources that humans cannot process.

---

## Quantifiable Impact (for Judges)

- Reduce food waste through accurate demand prediction
- Increase sales by correctly anticipating demand
- Save planning time from hours to minutes
- Confidence scores help SMEs understand prediction reliability

---

---

## Feature Breakdown

### 1. Industry Templates (Selectable)

| Template | Internal Data | External Data | Output Focus |
|----------|---------------|---------------|---------------|
| **Food & Hospitality** | Sales by dish, ingredients, recipe costs, prep time | Food trends, weather, local events | Menu demand, inventory, staff |
| **Retail** | Sales by product, supplier info, stock levels | Shopping trends, economic news, competitor opening | Product demand, re-order timing |
| **Services** | Bookings, staff skills, equipment, material costs | Event calendar, wedding season trends, weather | Booking capacity, staff allocation |

### 2. Data Configuration Modules

#### Internal Data (User Provides / Uploads)

| Data Type | Description | Required? |
|-----------|-------------|-----------|
| Sales History | Past sales by date/product | Yes |
| Product/Item List | What you sell | Yes |
| Inventory Records | Current stock levels | Yes |
| Pricing History | Price changes over time | Recommended |
| Staff/Resource Info | Staff count, costs, skills | Recommended |
| Customer Data | Customer list, purchase frequency | Optional |
| Expense Records | Monthly/yearly spending | Optional |

#### External Data (Auto-Fetched)

| Data Source | API Type | What It Provides | Toggle? |
|-------------|----------|------------------|---------|
| Google Trends | Search API | Product search popularity | Yes |
| Weather | Weather API | Forecast for planning | Yes |
| School Holidays | Calendar API | School break dates | Yes |
| Public Holidays | Calendar API | Public holiday dates | Yes |
| Economic Indicators | Economic API | CPI, spending trends | Yes |
| Industry Benchmarks | Database | Industry average growth | Yes |
| Custom API | User-defined | Any external data source | Add custom |

#### Output Modules (Customizable)

| Output Type | Description |
|-------------|-------------|
| Demand Forecast | Predicted sales/volume per celebration |
| Inventory Recommendations | What to stock, how much, when to reorder |
| Action Checklist | Concrete tasks: buy, hire, promote, schedule |
| Confidence Score | How reliable is this prediction (%) |
| Explanation | Plain-language why this prediction |
| Alert/Notification | When prediction confidence drops |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Industry   │  │ Internal Data│  │   External APIs       │ │
│  │   Template   │──│  Config      │──│   (Toggle/Add Custom) │ │
│  │  (3 types)   │  │  (Flexible)  │  │                       │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CORE ENGINE                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Z.AI GLM Engine                        │ │
│  │  • Data aggregation & normalization                        │ │
│  │  • Pattern recognition across data sources                │ │
│  │  • Context-aware reasoning                                │ │
│  │  • Insight generation                                    │ │
│  │  • Action recommendation                                    │ │
│  │  • Explanation generation                                │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OUTPUT LAYER                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │  Dashboard       │  │  External Data   │  │  Action     │ │
│  │  (Visualization)  │  │  Section         │  │  Checklist  │ │
│  └──────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Summary

| Module | Details |
|--------|---------|
| **Industry Template** | Food & Hospitality, Retail, Services (selectable, customizable) |
| **Internal Data Input** | Flexible - user provides what they have, system asks for essentials |
| **External Data Fetch** | Pre-connected APIs (Google Trends, Weather, Holidays, Economic) + Custom API |
| **Prediction Engine** | Z.AI GLM - processes all data sources, generates insights |
| **Output Dashboard** | Visualizations + External Data Section + Action Checklist |
| **Auto Schedule** | Runs automatically on scheduled basis |

---

## Implementation Notes

- System should be proactive in asking for missing context if internal data is incomplete
- Z.AI GLM serves as the core engine for analysis and insight generation
- If GLM component is removed, system should no longer be able to generate meaningful insights
- Each output module can be enabled/disabled based on user preference
# Project TODO - SME Business Intelligence

## Immediate Next Steps

### For Hackathon Presentation
- [ ] Connect backend API for real predictions (HIGH)
- [ ] Connect backend API for real actions (HIGH)
- [ ] Add GLM integration (HIGH)
- [ ] Test full flow: Data Input → Predictions → Actions

### For Better Demo
- [ ] Add sample data pre-loaded
- [ ] Connect External Data APIs (Trends, Weather)
- [ ] Add export to CSV feature

---

## Backend Connection Checklist

```
Frontend → Backend API Mapping:

Page            | Current       | To Do
---------------|--------------|------------------
Dashboard      | Mock data    | Connect /api/analysis/data
Analysis       | Mock data    | Connect /api/analysis/data
Predictions    | Mock data    | Connect /api/forecast
Actions        | Mock data    | Connect /api/actions
AI Assistant   | Mock data    | Connect /api/ai/whatif + /api/ai/ask
External Data  | Mock data    | Connect /api/external/fetch
Data Input     | ✅ Working  | Send to /api/data (new)
```

---

## API Endpoints Needed

```python
# Existing (working)
GET  /api/health
POST /api/glm/predict
POST /api/glm/analyze

# To implement
POST /api/data/save      # Save entered data
POST /api/analysis/data # Get analysis results
POST /api/forecast      # Get predictions
POST /api/actions       # Get recommendations
POST /api/external/fetch # Get external data
POST /api/ai/whatif    # What-if analysis
POST /api/ai/ask       # Ask AI question
```

---

## Tasks by Priority

### P0 - Must Have (Hackathon)
1. ⬜ Connect /api/forecast to Predictions page
2. ⬜ Connect /api/actions to Actions page
3. ⬜ Add real GLM response to AI Assistant

### P1 - Should Have
1. ⬜ Connect /api/external/fetch to External Data
2. ⬜ Connect /api/analysis to Analysis page
3. ⬜ Add sample data for demo

### P2 - Nice to Have
1. ⬜ Add data persistence (localStorage or database)
2. ⬜ Add CSV export
3. ⬜ Add PDF report

---

## Quick Wins (Help Needed)

- Someone to help test the API endpoints
- Access to GLM API key
- Sample mini market data for pre-loading

---

## Blocker

- Need backend running to test real API calls
- Need GLM API key for full AI functionality

---

*Last Updated: April 19, 2026*
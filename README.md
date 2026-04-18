# UMHackathon 2026 - Celebration Demand Intelligence

AI-powered decision intelligence system for SMEs to predict demand during celebration seasons.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Backend | Python Flask |
| AI | Z.AI GLM |

## Prerequisites

- Node.js 18+
- Python 3.10+
- Z.AI API Key

## Setup

### 1. Clone & Install

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
```

### 2. Configure API Key

Create or edit `backend/.env`:

```
ZAI_API_KEY=your_api_key_here
```

## Running the Project

### Backend (Terminal 1)

```bash
cd backend
python main.py
```

- Runs on: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

### Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

- Runs on: `http://localhost:5173`
- Proxies API calls to backend

## API Endpoints

| Endpoint | Method | Description |
|----------|-------|-------------|
| `/api/health` | GET | Health check |
| `/api/glm/predict` | POST | Basic GLM prediction |
| `/api/glm/analyze` | POST | GLM with context |
| `/api/demand/forecast` | POST | Demand forecasting |

## Testing API

```bash
curl -X POST http://localhost:5000/api/glm/predict \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'
```

## Quick Start Without API Key

The backend works without an API key - it returns mock responses for testing.

## Project Structure

```
UMHACK2026/
├── backend/
│   ├── app/
│   │   ├── routes/    # API endpoints
│   │   ├── services/ # GLM integration
│   │   └── config.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── documentation/
    ├── UMHackathon2026 Testing Analysis Documentation (Preliminary).md
    ├── UMHackathon2026 Product Requirement Documentation.md
    └── UMHackathon2026 System Analysis Documentation.md
```

## Troubleshooting

**Backend not starting?**
```bash
pip install Flask python-dotenv requests
```

**Frontend not starting?**
```bash
cd frontend
npm install
npm run dev
```

**API calls failing?**
- Check backend is running on port 5000
- Check ZAI_API_KEY in `.env`
- Check CORS settings in backend
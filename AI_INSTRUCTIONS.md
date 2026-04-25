# UMHackathon 2026 - AI Decision Intelligence Project Template

This is a **template branch** for your hackathon team. Use this as a starting point.

---

## Instructions for AI Assistant

Follow these steps when helping the team:

### Step 1: Read the Domain Description

First, read the domain description to understand the project domain:

```
documentation/Domain_2_description.md
```

This tells you what kind of AI solution is needed.

### Step 2: Discuss & Decide on Project Idea

Talk with the team about:
- What problem to solve
- Target users
- Solution approach

**IMPORTANT:** Do NOT make changes to this template branch. Create a new branch after the team decides on their idea.

### Step 3: Review Required Documentation

The team has prepared template documentation in:

```
documentation/
├── UMHackathon2026 Testing Analysis Documentation (Preliminary).md
├── UMHackathon2026 Product Requirement Documentation.md
└── UMHackathon2026 System Analysis Documentation.md
```

After the team decides on the project idea, help them fill in these documents.

### Step 4: Run the Development Environment

Both frontend and backend need to run simultaneously for testing.

#### Backend (Python Flask)

```bash
cd backend
python main.py
```
- Runs on: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

#### Frontend (React + Vite)

```bash
cd frontend
npm run dev
```
- Runs on: `http://localhost:5173`
- Proxies API calls to backend automatically

### Step 5: Create New Branch for Your Project

When the team has decided on their idea:

```bash
# Create and switch to new branch
git checkout -b feature/[your-project-name]

# Or for documentation work
git checkout -b docs/[your-project-name]
```

**DO NOT** commit changes to this template branch - keep it clean for other teams.

---

## Quick Commands Reference

| Task | Command |
|------|---------|
| Backend | `cd backend && python main.py` |
| Frontend | `cd frontend && npm run dev` |
| New branch | `git checkout -b feature/[name]` |
| Check status | `git status` |

---

## Project Structure

```
UMHACK2026/
├── backend/           # Python Flask API
│   ├── app/
│   │   ├── routes/   # API endpoints
│   │   └── services/ # Business logic
│   ├── main.py
│   └── requirements.txt
├── frontend/          # React + Vite
│   ├── src/
│   └── package.json
└── documentation/     # Template documents
```

---

## Notes for AI

- The backend already has placeholder GLM service at `app/services/glm_service.py`
- Update the `.env` file with actual API key when available
- If no API key is set, the backend returns mock responses for testing
- Frontend proxies `/api/*` requests to backend automatically (see `vite.config.js`)
const API_BASE = 'https://kitakod-umhack-2026-web.onrender.com/api';

export const healthCheck = async () => {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
};

// GLM Basic
export const callGlmPredict = async (prompt) => {
  const response = await fetch(`${API_BASE}/glm/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return response.json();
};

// GLM with Context
export const callGlmAnalyze = async (prompt, context = [], systemPrompt = '') => {
  const response = await fetch(`${API_BASE}/glm/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context, system_prompt: systemPrompt })
  });
  return response.json();
};

// Data Analysis
export const getDataAnalysis = async (data) => {
  const response = await fetch(`${API_BASE}/analysis/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// Predictions
export const getForecast = async (data) => {
  const response = await fetch(`${API_BASE}/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// Action Suggestions
export const getActions = async (data) => {
  const response = await fetch(`${API_BASE}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// AI Assumptions (What-if)
export const getWhatIf = async (data) => {
  const response = await fetch(`${API_BASE}/ai/whatif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// Ask AI
export const askAI = async (data) => {
  const response = await fetch(`${API_BASE}/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// External Data Fetch
export const getExternalData = async (sources) => {
  const response = await fetch(`${API_BASE}/external/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources })
  });
  return response.json();
};

// Full Analysis (all categories)
export const getFullAnalysis = async (data) => {
  const response = await fetch(`${API_BASE}/analysis/full`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};
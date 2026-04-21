/**
 * Minimal typed-ish fetch wrapper for the GigShift backend.
 *
 * Design notes (mentor rationale):
 * - We use the Vite dev proxy (see vite.config.js) so all calls go to
 *   `/api/...`. No hard-coded host. Works identically in dev and
 *   production (served by the same origin).
 * - No axios. `fetch` is enough for a 1-week MVP and keeps the bundle
 *   small. Error shape is normalised via `ApiError`.
 */

const BASE = '/api';

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const init = { method, signal, headers: {} };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (err) {
    throw new ApiError(`Network error while calling ${path}`, { status: 0 });
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const msg = payload?.error || `Request failed (${res.status})`;
    throw new ApiError(msg, { status: res.status, body: payload });
  }

  return payload;
}

export const api = {
  health: () => request('/health'),

  getProfile: () => request('/profile'),

  getSignalsToday: (dateIso) =>
    request(`/external/today${dateIso ? `?date=${dateIso}` : ''}`),

  getAnalytics: (days = 14) => request(`/analytics/summary?days=${days}`),

  generatePlan: ({ start, end, driverId = 'local' }) =>
    request('/plan/generate', {
      method: 'POST',
      body: { driver_id: driverId, window: { start, end } },
    }),

  askFollowup: ({ planId, question }) =>
    request('/plan/ask', {
      method: 'POST',
      body: { plan_id: planId, question },
    }),

  uploadEarnings: ({ platform, rows, csvText, driverId = 'local' }) =>
    request('/earnings/upload', {
      method: 'POST',
      body: {
        platform,
        rows,
        csv_text: csvText,
        driver_id: driverId,
      },
    }),
};

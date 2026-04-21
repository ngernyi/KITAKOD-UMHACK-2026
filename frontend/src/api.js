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
  saveProfile: (profile) =>
    request('/profile', { method: 'PUT', body: profile }),

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

  getEarningsTotals: (days = 14) =>
    request(`/earnings/totals?days=${days}`),

  earningsTemplateUrl: (platform = 'grab') =>
    `/api/earnings/template?platform=${encodeURIComponent(platform)}`,

  runBacktest: ({ start, end, driverId = 'local' }) =>
    request('/backtest/run', {
      method: 'POST',
      body: { driver_id: driverId, window: { start, end } },
    }),
};

/** Options lists shared across pages. Keep in sync with backend enums. */
export const PLATFORMS = [
  { id: 'grab', label: 'Grab' },
  { id: 'maxim', label: 'Maxim' },
  { id: 'airasia_ride', label: 'AirAsia Ride' },
  { id: 'indrive', label: 'inDrive' },
];

export const VEHICLE_TYPES = [
  { id: 'car', label: 'Car' },
  { id: 'motorbike', label: 'Motorbike' },
];

export const FUEL_TYPES = [
  { id: 'ron95', label: 'RON95' },
  { id: 'ron97', label: 'RON97' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'ev', label: 'EV (electric)' },
];

/** Zone ids - keep in sync with backend/data/zones_kl.json. */
export const ZONES = [
  { id: 'klcc', label: 'KLCC' },
  { id: 'bukit_bintang', label: 'Bukit Bintang' },
  { id: 'bangsar', label: 'Bangsar / Bangsar South' },
  { id: 'mid_valley', label: 'Mid Valley / KL Sentral' },
  { id: 'sunway', label: 'Sunway Pyramid / Bandar Sunway' },
  { id: 'petaling_jaya_ss2', label: 'PJ SS2 / Damansara' },
  { id: 'subang_jaya', label: 'Subang Jaya' },
  { id: 'puchong', label: 'Puchong / IOI Mall' },
  { id: 'cheras', label: 'Cheras' },
  { id: 'setapak_wangsa_maju', label: 'Setapak / Wangsa Maju' },
  { id: 'ampang', label: 'Ampang' },
  { id: 'kepong', label: 'Kepong' },
  { id: 'klia_klia2', label: 'KLIA / KLIA2' },
  { id: 'shah_alam', label: 'Shah Alam' },
  { id: 'klang', label: 'Klang' },
  { id: 'cyberjaya_putrajaya', label: 'Cyberjaya / Putrajaya' },
  { id: 'mont_kiara_sri_hartamas', label: 'Mont Kiara / Sri Hartamas' },
  { id: 'kota_damansara', label: 'Kota Damansara / TTDI' },
];

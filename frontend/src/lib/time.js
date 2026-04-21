/**
 * Converts a native `<input type="datetime-local">` value (local time, no zone)
 * to an ISO string the backend expects (UTC).
 */
export function localInputToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Inverse: ISO -> local datetime-local string `YYYY-MM-DDTHH:mm`.
 */
export function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Defaults for the next shift:
 * - Today 18:00 to 23:00 if it's before 17:30, else "tomorrow" same window.
 */
export function defaultShiftWindow(now = new Date()) {
  const base = new Date(now);
  if (base.getHours() >= 17 && base.getMinutes() >= 30) {
    base.setDate(base.getDate() + 1);
  }
  const start = new Date(base);
  start.setHours(18, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 0, 0, 0);
  return { start, end };
}

/**
 * Default backtest window: last 7 full days, ending at local midnight today.
 * Using days-only granularity keeps the UX simple - one replay per calendar day.
 */
export function defaultBacktestWindow(now = new Date()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { start, end };
}

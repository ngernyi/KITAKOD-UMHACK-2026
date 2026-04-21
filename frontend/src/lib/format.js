import { format, parseISO } from 'date-fns';

const PLATFORM_LABELS = {
  grab: 'Grab',
  maxim: 'Maxim',
  airasia_ride: 'AirAsia Ride',
  indrive: 'inDrive',
};

const PLATFORM_COLORS = {
  grab: '#00b14f',
  maxim: '#ffcf00',
  airasia_ride: '#ff2d2d',
  indrive: '#c4fd00',
};

export function platformLabel(id) {
  return PLATFORM_LABELS[id] || id;
}

export function platformColor(id) {
  return PLATFORM_COLORS[id] || '#64748b';
}

export function zoneLabel(id) {
  if (!id) return '';
  return id
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export function formatRm(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'RM 0';
  return `RM ${value.toFixed(2)}`;
}

export function formatRmShort(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'RM 0';
  return `RM ${Math.round(value)}`;
}

export function formatTime(iso) {
  if (!iso) return '';
  return format(parseISO(iso), 'HH:mm');
}

export function formatDate(iso) {
  if (!iso) return '';
  return format(parseISO(iso), 'EEE, d MMM');
}

export function formatDateTime(iso) {
  if (!iso) return '';
  return format(parseISO(iso), 'EEE, d MMM HH:mm');
}

export function durationHours(startIso, endIso) {
  const s = parseISO(startIso).getTime();
  const e = parseISO(endIso).getTime();
  return Math.max(0, (e - s) / 3_600_000);
}

/**
 * "weather:light_rain" -> "Weather: light rain"
 */
export function prettifySignal(signal) {
  if (!signal) return '';
  const [kind, ...rest] = signal.split(':');
  const value = rest.join(':').replace(/_/g, ' ');
  const kindLabel = {
    weather: 'Weather',
    event: 'Event',
    history: 'History',
    fuel: 'Fuel',
    holiday: 'Holiday',
    school_break: 'School break',
  }[kind] || kind;
  return value ? `${kindLabel}: ${value}` : kindLabel;
}

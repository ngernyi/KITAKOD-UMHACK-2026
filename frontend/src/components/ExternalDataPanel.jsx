import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatTime, zoneLabel } from '../lib/format.js';
import './ExternalDataPanel.css';

/**
 * Transparency panel: shows the exact external data that will feed
 * today's plan prompt. Every number / tag here is what the reasoning
 * engine sees - nothing secret, nothing fabricated.
 *
 * Visible by default (collapsible). Shown on the Plan page so judges
 * and drivers can audit the inputs before generating.
 */
export default function ExternalDataPanel({ dateIso, expanded = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(expanded);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getSignalsToday(dateIso)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateIso]);

  const eventCount = data?.events?.length || 0;
  const holidayNames = (data?.public_holidays || []).map((h) => h.name);

  return (
    <section className={`edp ${open ? 'edp--open' : 'edp--closed'}`} aria-label="External data">
      <button
        type="button"
        className="edp__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="edp__header-left">
          <span className="edp__title">What data feeds the plan today?</span>
          <span className="edp__sub">
            {loading
              ? 'Loading signals…'
              : data
              ? summarise(data, eventCount, holidayNames)
              : 'Unable to load today\'s signals.'}
          </span>
        </div>
        <span className="edp__chev" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        loading ? (
          <div className="edp__body edp__body--skeleton">Loading…</div>
        ) : !data ? (
          <div className="edp__body edp__body--empty">
            Couldn't load today's signals. The plan will still run using fallback data.
          </div>
        ) : (
          <div className="edp__body">
            <WeatherCard weather={data.weather} />
            <FuelCard fuel={data.fuel} />
            <HolidayCard holidays={data.public_holidays} schoolBreak={data.school_break} />
            <EventsCard events={data.events} />
          </div>
        )
      ) : null}
    </section>
  );
}

function summarise(data, eventCount, holidayNames) {
  const bits = [];
  if (data.weather) {
    bits.push(`${data.weather.condition}, ${Math.round(data.weather.temperature_c)}°C`);
  }
  if (holidayNames.length) {
    bits.push(`holiday: ${holidayNames[0]}`);
  } else if (data.school_break) {
    bits.push('school break');
  }
  bits.push(`RON95 RM${data.fuel.ron95.toFixed(2)}/L`);
  bits.push(`${eventCount} event${eventCount === 1 ? '' : 's'}`);
  return bits.join(' · ');
}

function WeatherCard({ weather }) {
  if (!weather) {
    return (
      <article className="edp-card">
        <header className="edp-card__header">Weather</header>
        <p className="edp-card__empty">Not available.</p>
      </article>
    );
  }
  const icon = weatherIcon(weather.condition);
  return (
    <article className="edp-card">
      <header className="edp-card__header">Weather</header>
      <div className="edp-card__weather">
        <div className="edp-card__weather-icon" aria-hidden="true">{icon}</div>
        <div>
          <div className="edp-card__weather-condition">{weather.condition}</div>
          <div className="edp-card__weather-stats">
            <span>{Math.round(weather.temperature_c)}°C</span>
            <span>·</span>
            <span>{weather.rain_mm.toFixed(1)} mm rain</span>
            <span>·</span>
            <span>{weather.wind_kph.toFixed(0)} kph wind</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function FuelCard({ fuel }) {
  return (
    <article className="edp-card">
      <header className="edp-card__header">Fuel prices (MYT)</header>
      <ul className="edp-card__fuel">
        <li><span>RON95</span><strong>RM {fuel.ron95.toFixed(2)}/L</strong></li>
        <li><span>RON97</span><strong>RM {fuel.ron97.toFixed(2)}/L</strong></li>
        <li><span>Diesel</span><strong>RM {fuel.diesel.toFixed(2)}/L</strong></li>
      </ul>
      <p className="edp-card__note">Week starting {fuel.week_start}.</p>
    </article>
  );
}

function HolidayCard({ holidays, schoolBreak }) {
  const hasHoliday = holidays.length > 0;
  return (
    <article className="edp-card">
      <header className="edp-card__header">Calendar</header>
      {hasHoliday ? (
        <ul className="edp-card__holidays">
          {holidays.map((h) => (
            <li key={h.date}>
              <strong>{h.name}</strong>
              <span>{h.date} · {h.type}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="edp-card__note">No public holiday today.</p>
      )}
      {schoolBreak ? (
        <p className="edp-card__pill edp-card__pill--info">School break active</p>
      ) : null}
    </article>
  );
}

function EventsCard({ events }) {
  if (!events.length) {
    return (
      <article className="edp-card edp-card--wide">
        <header className="edp-card__header">Events in Klang Valley</header>
        <p className="edp-card__empty">No notable events today.</p>
      </article>
    );
  }
  return (
    <article className="edp-card edp-card--wide">
      <header className="edp-card__header">Events in Klang Valley ({events.length})</header>
      <ul className="edp-card__events">
        {events.map((e) => (
          <li key={e.id} className="edp-event">
            <div className="edp-event__primary">
              <strong>{e.name}</strong>
              <span className="edp-event__venue">{e.venue}</span>
            </div>
            <div className="edp-event__meta">
              <span className={`edp-event__crowd edp-event__crowd--${e.expected_crowd}`}>
                {crowdLabel(e.expected_crowd)}
              </span>
              <span className="edp-event__time">
                {formatTime(e.start_ts)} – {formatTime(e.end_ts)}
              </span>
              <span className="edp-event__zone">{zoneLabel(e.zone)}</span>
            </div>
            {e.notes ? <p className="edp-event__notes">{e.notes}</p> : null}
          </li>
        ))}
      </ul>
    </article>
  );
}

function weatherIcon(condition) {
  const c = (condition || '').toLowerCase();
  if (c.includes('thunder')) return '⛈';
  if (c.includes('rain') || c.includes('shower')) return '🌧';
  if (c.includes('cloud')) return '☁';
  if (c.includes('haze') || c.includes('mist') || c.includes('fog')) return '🌫';
  if (c.includes('wind')) return '💨';
  return '☀';
}

function crowdLabel(crowd) {
  const map = { small: 'small crowd', medium: 'medium crowd', large: 'large crowd', mega: 'mega crowd' };
  return map[crowd] || crowd;
}

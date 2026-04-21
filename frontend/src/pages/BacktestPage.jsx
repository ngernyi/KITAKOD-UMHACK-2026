import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, ApiError } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Notice from '../components/Notice.jsx';
import {
  formatDate,
  formatRm,
  formatTime,
  platformColor,
  platformLabel,
  zoneLabel,
} from '../lib/format.js';
import { defaultBacktestWindow, isoToLocalInput, localInputToIso } from '../lib/time.js';
import './BacktestPage.css';

/**
 * Backtest page.
 *
 * The pitch: "If you'd followed GigShift's advice last week, would you
 * have earned more?" Reports two projections honestly:
 *   - same-hours (credible headline, apples to apples)
 *   - full-plan (aspirational ceiling)
 *
 * Rate-source badges on each slot expose how confident each number is
 * (zone_hour_platform > zone_hour > zone > overall > default).
 */
export default function BacktestPage() {
  const defaults = useMemo(() => defaultBacktestWindow(), []);
  const [startLocal, setStartLocal] = useState(() => isoToLocalInput(defaults.start.toISOString()));
  const [endLocal, setEndLocal] = useState(() => isoToLocalInput(defaults.end.toISOString()));
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run(e) {
    e?.preventDefault();
    const start = localInputToIso(startLocal);
    const end = localInputToIso(endLocal);
    if (!start || !end) {
      setError('Pick a start and end date.');
      return;
    }
    if (new Date(start) >= new Date(end)) {
      setError('Start must be before end.');
      return;
    }
    const days = (new Date(end) - new Date(start)) / 86_400_000;
    if (days > 31) {
      setError('Backtest window capped at 31 days.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.runBacktest({ start, end });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unexpected error running backtest.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Backtest · economic impact"
        title={<>Would GigShift have made you <span className="bt-accent">more money</span>?</>}
        description="Replay the plan engine against a historical window. The baseline is what you actually earned; the projection is what your own empirical RM/hr would have yielded on GigShift's recommended slots. No invented multipliers."
      />

      <form className="bt" onSubmit={run}>
        <label className="bt__field">
          <span className="bt__label">Window start</span>
          <input
            type="datetime-local"
            className="bt__input"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
          />
        </label>
        <label className="bt__field">
          <span className="bt__label">Window end</span>
          <input
            type="datetime-local"
            className="bt__input"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
          />
        </label>
        <button type="submit" className="bt__run" disabled={loading}>
          {loading ? 'Running…' : 'Run backtest'}
        </button>
      </form>

      {error ? <Notice tone="danger" title="Can't run backtest:">{error}</Notice> : null}

      {result ? <Result result={result} /> : <EmptyBacktest />}
    </>
  );
}

function Result({ result }) {
  const {
    baseline_nett_rm,
    baseline_trips,
    baseline_hours_online,
    baseline_rm_per_hour,
    projected_nett_same_hours,
    projected_nett_full_plan,
    projected_rm_per_hour,
    plan_hours_total,
    delta_rm,
    delta_pct,
    per_day,
    warnings,
    rate_matrix_trip_count,
    rate_matrix_lookback_days,
  } = result;

  const deltaPositive = delta_rm > 0;
  const deltaZero = Math.abs(delta_rm) < 0.01;

  const chartData = per_day.map((d) => ({
    date: formatDate(`${d.date}T00:00:00`),
    baseline: d.baseline_nett_rm,
    projected_same: d.projected_nett_same_hours,
    projected_full: d.projected_nett_full_plan,
  }));

  return (
    <section className="bt-result">
      {baseline_nett_rm === 0 ? (
        <Notice tone="warn" title="No baseline trips in this window.">
          We can still show the full-plan projection, but the headline delta needs real trips
          to compare against. Try a window that includes days you drove — or{' '}
          <Link to="/earnings">upload more earnings</Link>.
        </Notice>
      ) : null}

      {warnings.includes('thin_rate_matrix') ? (
        <Notice tone="info" title="Thin history.">
          Fewer than 5 trips before the window — projections lean on zone-level or overall averages.
          More uploaded trips = more precise per-slot rates.
        </Notice>
      ) : null}

      <div className="bt-headline">
        <div className={`bt-headline__delta bt-headline__delta--${deltaPositive ? 'pos' : deltaZero ? 'zero' : 'neg'}`}>
          <span className="bt-headline__delta-pct">
            {deltaPositive ? '+' : ''}
            {delta_pct.toFixed(1)}%
          </span>
          <span className="bt-headline__delta-rm">
            {deltaPositive ? '+' : ''}
            {formatRm(delta_rm)}
          </span>
          <span className="bt-headline__delta-caption">
            vs. your actual earnings · same hours driven
          </span>
        </div>

        <div className="bt-kpis">
          <Kpi label="Baseline nett" value={formatRm(baseline_nett_rm)} sub={`${baseline_hours_online.toFixed(2)} h online · ${baseline_trips} trips`} />
          <Kpi label="Your RM / hr" value={formatRm(baseline_rm_per_hour)} sub="actual last week" />
          <Kpi label="Plan's RM / hr" value={formatRm(projected_rm_per_hour)} sub={`${plan_hours_total.toFixed(1)} plan-hours analysed`} accent />
          <Kpi label="Same-hours projection" value={formatRm(projected_nett_same_hours)} sub="apples-to-apples" />
        </div>
      </div>

      <section className="bt-section">
        <header className="bt-section__header">
          <h3 className="bt-section__title">Baseline vs. projection, per day</h3>
          <p className="bt-section__lede">
            Green = what your history suggests the plan slots would have paid if driven. Grey = what you actually earned that calendar day.
          </p>
        </header>
        <div className="bt-chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `RM${v}`} />
              <Tooltip content={<DayTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="baseline" name="Actual earned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected_same" name="Projected (same hours)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bt-section">
        <header className="bt-section__header">
          <h3 className="bt-section__title">Full-plan ceiling</h3>
          <p className="bt-section__lede">
            Projected earnings if you'd followed <em>every</em> recommended slot — including hours you weren't online. Useful as an aspirational ceiling; not the headline because the hours aren't comparable.
          </p>
        </header>
        <div className="bt-ceiling">
          <div>
            <strong>{formatRm(projected_nett_full_plan)}</strong>
            <span>across {plan_hours_total.toFixed(1)} recommended hours</span>
          </div>
          <div className="bt-ceiling__spread">
            vs. {formatRm(baseline_nett_rm)} actual ({baseline_hours_online.toFixed(2)} h)
          </div>
        </div>
      </section>

      <section className="bt-section">
        <header className="bt-section__header">
          <h3 className="bt-section__title">Per-day breakdown</h3>
          <p className="bt-section__lede">
            Each day is replayed independently with a fresh plan. Slot rates are looked up in your own history.
          </p>
        </header>
        <div className="bt-days">
          {per_day.map((d) => (
            <DayCard key={d.date} day={d} />
          ))}
        </div>
      </section>

      <footer className="bt-footnote">
        <strong>Honesty panel.</strong> Rate matrix built from{' '}
        <code>{rate_matrix_trip_count}</code> of your trips in the {rate_matrix_lookback_days} days before the window.
        Each slot uses the most specific bucket with ≥ 2 samples; otherwise it falls back through zone-hour → zone → overall → conservative default. Source shown on every slot.
      </footer>
    </section>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className={`bt-kpi ${accent ? 'bt-kpi--accent' : ''}`}>
      <span className="bt-kpi__label">{label}</span>
      <span className="bt-kpi__value">{value}</span>
      {sub ? <span className="bt-kpi__sub">{sub}</span> : null}
    </div>
  );
}

function DayCard({ day }) {
  return (
    <article className="bt-day">
      <header className="bt-day__header">
        <h4>{formatDate(`${day.date}T00:00:00`)}</h4>
        <div className="bt-day__stats">
          <span>
            Actual: <strong>{formatRm(day.baseline_nett_rm)}</strong>
            <em>({day.baseline_hours.toFixed(2)}h · {day.baseline_trips} trips)</em>
          </span>
          <span>
            Same-hrs: <strong>{formatRm(day.projected_nett_same_hours)}</strong>
          </span>
          <span className={`bt-day__delta ${day.delta_rm >= 0 ? 'pos' : 'neg'}`}>
            {day.delta_rm >= 0 ? '+' : ''}
            {formatRm(day.delta_rm)}
          </span>
        </div>
        {day.note ? <span className="bt-day__note">{day.note}</span> : null}
      </header>

      {day.slots.length === 0 ? (
        <p className="bt-day__empty">No plan produced for this day.</p>
      ) : (
        <div className="bt-slots">
          {day.slots.map((slot, i) => (
            <div
              key={i}
              className="bt-slot"
              style={{ borderLeftColor: platformColor(slot.platform) }}
            >
              <div className="bt-slot__time">
                {formatTime(slot.start)} – {formatTime(slot.end)}
                <span className="bt-slot__duration">({slot.duration_hours.toFixed(1)}h)</span>
              </div>
              <div className="bt-slot__where">
                <span className="bt-slot__platform" style={{ color: platformColor(slot.platform) }}>
                  {platformLabel(slot.platform)}
                </span>
                <span className="bt-slot__arrow">→</span>
                <span className="bt-slot__zone">{zoneLabel(slot.zone)}</span>
              </div>
              <div className="bt-slot__money">
                <span className="bt-slot__rate">{formatRm(slot.rate_rm_per_hour)}/hr</span>
                <span className="bt-slot__projected">{formatRm(slot.projected_nett_rm)}</span>
              </div>
              <div
                className={`bt-slot__source bt-slot__source--${slot.rate_source}`}
                title={slot.rate_source_note}
              >
                {sourceLabel(slot.rate_source)}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function sourceLabel(src) {
  switch (src) {
    case 'zone_hour_platform':
      return 'exact match';
    case 'zone_hour':
      return 'zone + hour';
    case 'zone':
      return 'zone avg';
    case 'overall':
      return 'your overall';
    case 'default':
      return 'default (no history)';
    default:
      return src;
  }
}

function DayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { baseline, projected_same, projected_full } = payload[0].payload;
  return (
    <div className="tip">
      <strong>{label}</strong>
      <div>Actual: {formatRm(baseline)}</div>
      <div>Same-hrs projection: {formatRm(projected_same)}</div>
      <div className="tip__muted">Full-plan ceiling: {formatRm(projected_full)}</div>
    </div>
  );
}

function EmptyBacktest() {
  return (
    <div className="bt-empty">
      <p>Pick a historical window and click <em>Run backtest</em>.</p>
      <p className="bt-empty__hint">
        Tip: make sure you've <Link to="/earnings">uploaded at least a few weeks of earnings</Link> before running —
        the rate matrix is built from that history.
      </p>
    </div>
  );
}

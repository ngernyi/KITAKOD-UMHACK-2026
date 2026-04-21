import { useMemo, useState } from 'react';
import { defaultShiftWindow, isoToLocalInput, localInputToIso } from '../lib/time.js';
import './WindowPicker.css';

/**
 * Shift-window input. Lightweight: two native datetime-local inputs +
 * a generate button. Emits ISO strings (UTC) on submit.
 */
export default function WindowPicker({ onSubmit, loading }) {
  const initial = useMemo(() => {
    const { start, end } = defaultShiftWindow();
    return {
      start: isoToLocalInput(start.toISOString()),
      end: isoToLocalInput(end.toISOString()),
    };
  }, []);

  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [error, setError] = useState(null);

  const hours = useMemo(() => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Math.max(0, (e - s) / 3_600_000);
  }, [start, end]);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const startIso = localInputToIso(start);
    const endIso = localInputToIso(end);
    if (!startIso || !endIso) {
      setError('Pick a valid start and end time.');
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      setError('End time must be after start time.');
      return;
    }
    onSubmit({ start: startIso, end: endIso });
  }

  return (
    <form className="picker" onSubmit={handleSubmit}>
      <div className="picker__header">
        <div>
          <h2 className="picker__title">Plan my next shift</h2>
          <p className="picker__subtitle">
            GigShift will pick the best app, zone, and time slices for your availability window.
          </p>
        </div>
      </div>

      <div className="picker__grid">
        <label className="picker__field">
          <span className="picker__label">Shift start</span>
          <input
            className="picker__input"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </label>

        <label className="picker__field">
          <span className="picker__label">Shift end</span>
          <input
            className="picker__input"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </label>

        <div className="picker__field picker__field--meta">
          <span className="picker__label">Duration</span>
          <span className="picker__duration">
            {hours > 0 ? `${hours.toFixed(1)} hours` : '—'}
          </span>
        </div>
      </div>

      {error ? <p className="picker__error" role="alert">{error}</p> : null}

      <button type="submit" className="picker__submit" disabled={loading}>
        {loading ? (
          <>
            <span className="picker__spinner" aria-hidden="true" />
            Thinking…
          </>
        ) : (
          <>Generate plan</>
        )}
      </button>
    </form>
  );
}

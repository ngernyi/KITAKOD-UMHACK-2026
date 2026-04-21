import {
  durationHours,
  formatRm,
  formatTime,
  platformColor,
  platformLabel,
  zoneLabel,
} from '../lib/format.js';
import './PlanCard.css';

/**
 * A single time-sliced window inside the Plan.
 * The left rail is a coloured bar keyed to the platform (Grab green,
 * Maxim yellow, etc.) - lets the driver scan the plan at a glance.
 */
export default function PlanCard({ window, index, total }) {
  const color = platformColor(window.platform);
  const hours = durationHours(window.start, window.end);
  const rmPerHour = hours > 0 ? window.expected_nett_rm / hours : 0;

  return (
    <article className="plancard" style={{ '--platform-color': color }}>
      <div className="plancard__rail" aria-hidden="true" />

      <header className="plancard__header">
        <div className="plancard__slot">
          <span className="plancard__slot-index">#{index + 1} of {total}</span>
          <span className="plancard__slot-time">
            {formatTime(window.start)} – {formatTime(window.end)}
          </span>
          <span className="plancard__slot-duration">{hours.toFixed(1)}h</span>
        </div>

        <div className="plancard__earnings">
          <span className="plancard__earnings-label">Expected</span>
          <span className="plancard__earnings-value">{formatRm(window.expected_nett_rm)}</span>
          <span className="plancard__earnings-rate">
            ≈ {formatRm(rmPerHour)}/hr
          </span>
        </div>
      </header>

      <div className="plancard__pair">
        <div className="plancard__pair-item">
          <span className="plancard__pair-label">Open app</span>
          <span
            className="plancard__platform"
            style={{ color: 'var(--platform-color)', borderColor: 'var(--platform-color)' }}
          >
            {platformLabel(window.platform)}
          </span>
        </div>
        <div className="plancard__pair-arrow" aria-hidden="true">→</div>
        <div className="plancard__pair-item">
          <span className="plancard__pair-label">Drive to / around</span>
          <span className="plancard__zone">{zoneLabel(window.zone)}</span>
        </div>
      </div>

      {window.rationale ? (
        <p className="plancard__rationale">
          <span className="plancard__rationale-marker">Why</span>
          {window.rationale}
        </p>
      ) : null}
    </article>
  );
}

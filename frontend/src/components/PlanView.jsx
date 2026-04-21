import FollowupPanel from './FollowupPanel.jsx';
import PlanCard from './PlanCard.jsx';
import SignalChip from './SignalChip.jsx';
import { formatDateTime, formatRm } from '../lib/format.js';
import './PlanView.css';

export default function PlanView({ plan }) {
  if (!plan) return null;
  const isMock = plan.warnings?.includes('glm_mock_mode');
  const isFallback = plan.fallback_used;
  const confidenceTone = plan.confidence >= 70 ? 'high' : plan.confidence >= 50 ? 'mid' : 'low';

  return (
    <section className="planview" aria-label="Generated shift plan">
      {isMock || isFallback ? (
        <div className={`planview__banner planview__banner--${isFallback ? 'fallback' : 'mock'}`}>
          {isFallback ? (
            <>
              <strong>Fallback mode</strong>
              <span> · Using historical averages. The AI reasoning engine did not return a usable response this time.</span>
            </>
          ) : (
            <>
              <strong>Mock mode</strong>
              <span> · No <code>ZAI_API_KEY</code> set. The plan is produced by a signal-aware deterministic mock so you can demo end-to-end.</span>
            </>
          )}
        </div>
      ) : null}

      <header className="planview__summary">
        <div className="planview__summary-main">
          <p className="planview__eyebrow">Plan for</p>
          <h2 className="planview__window">
            {formatDateTime(plan.availability_window.start)}
            <span className="planview__window-sep"> → </span>
            {formatDateTime(plan.availability_window.end)}
          </h2>
        </div>

        <div className="planview__kpis">
          <div className="planview__kpi">
            <span className="planview__kpi-label">Expected nett</span>
            <span className="planview__kpi-value">{formatRm(plan.total_expected_nett_rm)}</span>
          </div>
          <div className={`planview__kpi planview__kpi--confidence planview__kpi--${confidenceTone}`}>
            <span className="planview__kpi-label">Confidence</span>
            <span className="planview__kpi-value">{plan.confidence}<small>/100</small></span>
          </div>
          <div className="planview__kpi">
            <span className="planview__kpi-label">Windows</span>
            <span className="planview__kpi-value">{plan.windows.length}</span>
          </div>
        </div>
      </header>

      <div className="planview__cards">
        {plan.windows.map((w, i) => (
          <PlanCard key={`${plan.plan_id}-${i}`} window={w} index={i} total={plan.windows.length} />
        ))}
      </div>

      {plan.reasoning ? (
        <section className="planview__section">
          <h3 className="planview__section-title">Reasoning</h3>
          <p className="planview__reasoning">{plan.reasoning}</p>
        </section>
      ) : null}

      {plan.signals_used?.length ? (
        <section className="planview__section">
          <h3 className="planview__section-title">Signals used</h3>
          <p className="planview__section-subtitle">
            Everything the reasoning engine looked at to build this plan. Nothing outside this list was considered.
          </p>
          <div className="planview__signals">
            {plan.signals_used.map((sig) => (
              <SignalChip key={sig} signal={sig} />
            ))}
          </div>
        </section>
      ) : null}

      <FollowupPanel planId={plan.plan_id} />

      <footer className="planview__footer">
        <span>Plan ID: <code>{plan.plan_id.slice(0, 8)}</code></span>
        <span>Generated {formatDateTime(plan.generated_at)}</span>
      </footer>
    </section>
  );
}

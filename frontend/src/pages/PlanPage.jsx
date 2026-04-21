import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import WindowPicker from '../components/WindowPicker.jsx';
import PlanView from '../components/PlanView.jsx';
import Notice from '../components/Notice.jsx';
import ExternalDataPanel from '../components/ExternalDataPanel.jsx';
import './PlanPage.css';

/**
 * Plan page - the hero of the app. Assembles:
 *  - Honesty banner: surfaces when the backend is using stock defaults
 *    (no profile edits, no trips uploaded). Plans without personal data
 *    are generic; we say so.
 *  - WindowPicker: availability window input.
 *  - PlanView: result.
 *
 * We fetch profile + totals in parallel on mount, cheaply. If either
 * endpoint is offline the banner is suppressed - we never show fake
 * readiness.
 */
export default function PlanPage() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.getProfile(), api.getEarningsTotals(14)]).then((results) => {
      if (cancelled) return;
      if (results[0].status === 'fulfilled') setProfile(results[0].value);
      if (results[1].status === 'fulfilled') setTotals(results[1].value);
    });
    return () => {
      cancelled = true;
    };
  }, [plan?.plan_id]);

  async function handleGenerate({ start, end }) {
    setLoading(true);
    setError(null);
    try {
      const result = await api.generatePlan({ start, end });
      setPlan(result);
      requestAnimationFrame(() => {
        document.getElementById('plan-region')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ''}`
          : 'Something went wrong generating the plan.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="UMHackathon 2026 · Domain 2"
        title={<>Your next shift, <span className="plan-accent">planned</span>.</>}
        description="Tell GigShift when you can drive. It will pick the best platform, zone, and time slices for a Klang Valley multi-app driver — and explain every choice with concrete signals."
      />

      <PersonalisationBanner profile={profile} totals={totals} />

      <ExternalDataPanel expanded={!plan} />

      <WindowPicker onSubmit={handleGenerate} loading={loading} />

      {error ? (
        <Notice tone="danger" title="Can't generate a plan:">
          {error}
        </Notice>
      ) : null}

      <div id="plan-region">
        {plan ? <PlanView plan={plan} /> : <EmptyPlan />}
      </div>
    </>
  );
}

function PersonalisationBanner({ profile, totals }) {
  if (!profile && !totals) return null;
  const hasProfile = profile && profile.display_name && profile.display_name !== 'Driver';
  const hasPrefs = profile?.preferences?.trim().length > 0;
  const tripCount = totals?.trip_count ?? 0;

  if (hasProfile && tripCount > 0 && hasPrefs) {
    return (
      <Notice tone="success" title="Fully personalised.">
        Plans use your profile, {tripCount} recent trips, and your written preferences.
      </Notice>
    );
  }

  const missing = [];
  if (!hasProfile) missing.push(<Link key="p" to="/profile">set your profile</Link>);
  if (tripCount === 0) missing.push(<Link key="e" to="/earnings">upload earnings</Link>);
  if (!hasPrefs) missing.push(<Link key="pref" to="/profile">add driving preferences</Link>);

  return (
    <Notice tone="warn" title="Plans are using stock defaults.">
      To get personal recommendations —{' '}
      {missing.map((node, i) => (
        <span key={i}>
          {node}
          {i < missing.length - 1 ? ', ' : ''}
        </span>
      ))}
      .
    </Notice>
  );
}

function EmptyPlan() {
  return (
    <section className="empty">
      <div className="empty__icon" aria-hidden="true">🚗</div>
      <h3 className="empty__title">No plan yet</h3>
      <p className="empty__lede">
        Pick your availability window above and hit <em>Generate plan</em>. The first plan uses seeded
        Klang Valley events, public holidays, fuel prices, and — once you upload your earnings — your
        historical zone strength.
      </p>
    </section>
  );
}

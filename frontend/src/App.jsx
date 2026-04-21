import { useState } from 'react';
import NavBar from './components/NavBar.jsx';
import WindowPicker from './components/WindowPicker.jsx';
import PlanView from './components/PlanView.jsx';
import { api, ApiError } from './api.js';
import './App.css';

export default function App() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate({ start, end }) {
    setLoading(true);
    setError(null);
    try {
      const result = await api.generatePlan({ start, end });
      setPlan(result);
      // Scroll the plan into view on larger screens; on mobile, it's already
      // below the picker so this is cheap.
      requestAnimationFrame(() => {
        document.getElementById('plan-region')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    } catch (err) {
      const message = err instanceof ApiError
        ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ''}`
        : 'Something went wrong generating the plan.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />

      <main className="app-main">
        <div className="container app-main__inner">
          <section className="hero">
            <p className="hero__eyebrow">UMHackathon 2026 · Domain 2</p>
            <h1 className="hero__title">
              Your next shift, <span className="hero__accent">planned</span>.
            </h1>
            <p className="hero__lede">
              Tell GigShift when you can drive. It will pick the best platform, zone, and time slices for a
              Klang Valley multi-app driver — and explain every choice with concrete signals.
            </p>
          </section>

          <WindowPicker onSubmit={handleGenerate} loading={loading} />

          {error ? (
            <div className="app-error" role="alert">
              <strong>Can't generate a plan:</strong> {error}
            </div>
          ) : null}

          <div id="plan-region">
            {plan ? (
              <PlanView plan={plan} />
            ) : (
              <EmptyState loading={loading} />
            )}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="container app-footer__inner">
          <span>GigShift · built for UMHackathon 2026</span>
          <span className="app-footer__hint">
            Tip: set <code>ZAI_API_KEY</code> in <code>backend/.env</code> to use the real reasoning engine.
          </span>
        </div>
      </footer>
    </>
  );
}

function EmptyState({ loading }) {
  if (loading) return null;
  return (
    <section className="empty">
      <div className="empty__icon" aria-hidden="true">🚗</div>
      <h3 className="empty__title">No plan yet</h3>
      <p className="empty__lede">
        Pick your availability window above and hit <em>Generate plan</em>. The first plan uses seeded
        Klang Valley events, public holidays, fuel prices, and — once you upload your earnings (Phase C)
        — your historical zone strength.
      </p>
    </section>
  );
}

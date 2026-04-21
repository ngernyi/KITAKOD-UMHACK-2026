import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api.js';
import './FollowupPanel.css';

const SUGGESTIONS = [
  'Why this zone, not KLCC?',
  'How confident are you?',
  'Which platform pays me best tonight?',
  'How much will I earn in total?',
  'Any weather or safety concerns?',
];

/**
 * Follow-up Q&A thread for a generated Plan.
 *
 * Why this exists:
 *   Plans are opaque by default. A driver should be able to interrogate
 *   the recommendation in plain English and get an answer that cites
 *   the same signals the plan used. That's what separates a tool from
 *   a magic 8-ball.
 *
 * State strategy:
 *   - We refetch the thread whenever planId changes so switching plans
 *     restores history (the backend persists each turn to SQLite).
 *   - Optimistic append: we show the question immediately with a
 *     pending state, then swap in the real turn when the API returns.
 *   - Errors replace the pending turn with an inline error bubble, not
 *     a toast. Keeps context with the question that failed.
 */
export default function FollowupPanel({ planId }) {
  const [turns, setTurns] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const threadEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!planId) {
      setTurns([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    api
      .listFollowups(planId)
      .then((resp) => {
        if (cancelled) return;
        setTurns(resp.followups || []);
      })
      .catch(() => {
        if (!cancelled) setTurns([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length]);

  const send = useCallback(
    async (text) => {
      const q = text.trim();
      if (!q || !planId || loading) return;
      setLoading(true);
      const tempId = `tmp-${Date.now()}`;
      const pendingTurn = {
        id: tempId,
        question: q,
        answer: null,
        asked_at: new Date().toISOString(),
        pending: true,
      };
      setTurns((prev) => [...prev, pendingTurn]);
      setQuestion('');
      try {
        const resp = await api.askFollowup({ planId, question: q });
        setTurns((prev) =>
          prev.map((t) =>
            t.id === tempId
              ? { id: resp.id, question: resp.question, answer: resp.answer, asked_at: resp.asked_at }
              : t,
          ),
        );
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Could not reach the reasoning engine.';
        setTurns((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, pending: false, error: message } : t)),
        );
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [planId, loading],
  );

  function onSubmit(e) {
    e.preventDefault();
    send(question);
  }

  if (!planId) return null;

  return (
    <section className="fup" aria-label="Follow-up questions about this plan">
      <header className="fup__header">
        <h3 className="fup__title">Ask the plan</h3>
        <p className="fup__lede">
          Interrogate this recommendation in plain English. Answers cite the same signals the plan used.
        </p>
      </header>

      {turns.length === 0 && !loadingHistory ? (
        <div className="fup__suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="fup__suggestion"
              onClick={() => send(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <ol className="fup__thread">
        {turns.map((t) => (
          <li key={t.id} className="fup__turn">
            <div className="fup__bubble fup__bubble--q">
              <span className="fup__role">You</span>
              <span className="fup__text">{t.question}</span>
            </div>
            <div
              className={`fup__bubble fup__bubble--a ${
                t.pending ? 'fup__bubble--pending' : t.error ? 'fup__bubble--error' : ''
              }`}
            >
              <span className="fup__role">GigShift</span>
              <span className="fup__text">
                {t.pending ? (
                  <span className="fup__typing" aria-label="Thinking">
                    <span /><span /><span />
                  </span>
                ) : t.error ? (
                  t.error
                ) : (
                  t.answer
                )}
              </span>
            </div>
          </li>
        ))}
        <li ref={threadEndRef} aria-hidden="true" />
      </ol>

      <form className="fup__form" onSubmit={onSubmit}>
        <input
          ref={inputRef}
          className="fup__input"
          type="text"
          placeholder="Ask something specific — e.g. why not KLCC at 20:00?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          disabled={loading}
        />
        <button
          type="submit"
          className="fup__send"
          disabled={loading || !question.trim()}
          aria-label="Send question"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </form>
    </section>
  );
}

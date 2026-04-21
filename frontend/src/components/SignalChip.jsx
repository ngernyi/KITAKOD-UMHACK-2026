import { prettifySignal } from '../lib/format.js';
import './SignalChip.css';

const KIND_TONE = {
  weather: 'info',
  event: 'brand',
  history: 'neutral',
  fuel: 'warn',
  holiday: 'warn',
  school_break: 'warn',
};

export default function SignalChip({ signal }) {
  const [kind] = (signal || '').split(':');
  const tone = KIND_TONE[kind] || 'neutral';
  return (
    <span className={`chip chip--${tone}`}>
      <span className="chip__dot" aria-hidden="true" />
      {prettifySignal(signal)}
    </span>
  );
}

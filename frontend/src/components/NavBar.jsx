import { useEffect, useState } from 'react';
import { api } from '../api';
import './NavBar.css';

export default function NavBar() {
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then(() => !cancelled && setHealth('online'))
      .catch(() => !cancelled && setHealth('offline'));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <a href="/" className="navbar__brand" aria-label="GigShift home">
          <span className="navbar__logo" aria-hidden="true">G</span>
          <span className="navbar__name">GigShift</span>
          <span className="navbar__tag">Klang Valley co-pilot</span>
        </a>

        <div className={`navbar__status navbar__status--${health}`} aria-live="polite">
          <span className="navbar__dot" aria-hidden="true" />
          <span className="navbar__status-text">
            {health === 'online' ? 'Backend online' : health === 'offline' ? 'Backend offline' : 'Checking…'}
          </span>
        </div>
      </div>
    </header>
  );
}

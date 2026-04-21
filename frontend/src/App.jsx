import { Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import PlanPage from './pages/PlanPage.jsx';
import EarningsPage from './pages/EarningsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import BacktestPage from './pages/BacktestPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import './App.css';

export default function App() {
  return (
    <>
      <NavBar />

      <main className="app-main">
        <div className="container app-main__inner">
          <Routes>
            <Route path="/" element={<PlanPage />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/backtest" element={<BacktestPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>

      <footer className="app-footer">
        <div className="container app-footer__inner">
          <span>GigShift · UMHackathon 2026 · Domain 2</span>
          <span className="app-footer__hint">
            Tip: set <code>ZAI_API_KEY</code> in <code>backend/.env</code> to use the real reasoning engine.
          </span>
        </div>
      </footer>
    </>
  );
}

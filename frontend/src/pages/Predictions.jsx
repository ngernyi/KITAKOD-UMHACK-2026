import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './Predictions.css';

const Predictions = () => {
  const { internalData, isLoading, setIsLoading } = useApp();
  const [forecastDays, setForecastDays] = useState(7);

  const runForecast = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const mockForecastData = Array.from({ length: forecastDays }, (_, i) => {
    const baseValue = 350 + Math.random() * 150;
    return {
      day: i === 0 ? 'Tomorrow' : `Day ${i + 1}`,
      date: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric' }),
      predicted: Math.round(baseValue),
      range: `${Math.round(baseValue - 50)}-${Math.round(baseValue + 50)}`,
      trend: baseValue > 400 ? 'up' : baseValue < 300 ? 'down' : 'stable'
    };
  });

  const mockSeasonality = [
    { period: 'Ramadan', impact: '+45%', status: 'upcoming' },
    { period: 'School Holidays', impact: '+25%', status: 'upcoming' },
    { period: 'Hari Raya', impact: '+60%', status: 'upcoming' },
  ];

  const mockTrends = [
    { item: 'Nescafe', search: '+85%', action: 'Stock more' },
    { item: 'Milo 100g', search: '+42%', action: 'Monitor' },
    { item: 'Biscuit', search: '+15%', action: 'Normal' },
  ];

  return (
    <div className="predictions">
      <header className="page-header">
        <h1>Predictions</h1>
        <p>AI-powered demand forecasting</p>
      </header>

      {/* Forecast Controls */}
      <div className="forecast-controls">
        <div className="control-group">
          <label>Forecast Days</label>
          <div className="day-buttons">
            <button className={forecastDays === 7 ? 'active' : ''} onClick={() => setForecastDays(7)}>7 Days</button>
            <button className={forecastDays === 14 ? 'active' : ''} onClick={() => setForecastDays(14)}>14 Days</button>
            <button className={forecastDays === 30 ? 'active' : ''} onClick={() => setForecastDays(30)}>30 Days</button>
          </div>
        </div>
        <button className="run-btn" onClick={runForecast} disabled={isLoading}>
          {isLoading ? '🔮 Analyzing...' : '🔮 Run Forecast'}
        </button>
      </div>

      {/* Forecast Results */}
      <div className="forecast-section">
        <h3>📈 {forecastDays}-Day Demand Forecast</h3>
        <div className="forecast-list">
          {mockForecastData.map((f, idx) => (
            <div key={idx} className={`forecast-card ${f.trend}`}>
              <div className="forecast-day">
                <span className="day-name">{f.day}</span>
                <span className="day-date">{f.date}</span>
              </div>
              <div className="forecast-value">
                <span className="predicted">RM {f.predicted}</span>
                <span className="range">Range: {f.range}</span>
              </div>
              <div className="trend-indicator">
                {f.trend === 'up' && <span className="trend-badge up">📈</span>}
                {f.trend === 'down' && <span className="trend-badge down">📉</span>}
                {f.trend === 'stable' && <span className="trend-badge stable">➡️</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonality */}
      <div className="seasonality-section">
        <h3>📅 Seasonality & Events</h3>
        <div className="seasonality-list">
          {mockSeasonality.map((s, idx) => (
            <div key={idx} className={`seasonality-card ${s.status}`}>
              <span className="period">{s.period}</span>
              <span className="impact">{s.impact}</span>
              <span className="status-badge">{s.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Items */}
      <div className="trending-section">
        <h3>🔥 Trending Items (Google Trends)</h3>
        <div className="trending-list">
          {mockTrends.map((t, idx) => (
            <div key={idx} className="trending-card">
              <span className="item-name">{t.item}</span>
              <div className="trend-stats">
                <span className="search-change">{t.search}</span>
                <span className={`action ${t.action === 'Stock more' ? 'warning' : t.action === 'Monitor' ? 'info' : 'normal'}`}>
                  {t.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="forecast-summary">
        <div className="summary-item">
          <span className="label">Average Forecast</span>
          <span className="value">RM 380/day</span>
        </div>
        <div className="summary-item">
          <span className="label">Peak Day</span>
          <span className="value">RM 480 (Day 5)</span>
        </div>
        <div className="summary-item">
          <span className="label">Trend Direction</span>
          <span className="value trend-up">📈 Upward</span>
        </div>
      </div>
    </div>
  );
};

export default Predictions;
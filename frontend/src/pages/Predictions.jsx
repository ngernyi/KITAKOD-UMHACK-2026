import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
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
      lower: Math.round(baseValue - 50),
      upper: Math.round(baseValue + 50),
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

      {/* Top Section - Info Cards */}
      <div className="predictions-top-grid">
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
          <h3>🔥 Trending Items</h3>
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
          <h3>📊 Summary</h3>
          <div className="summary-items">
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
      </div>

      {/* Bottom Section - Forecast Graph */}
      <div className="forecast-graph-section">
        <h3>📈 {forecastDays}-Day Demand Forecast</h3>
        <div className="graph-container">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockForecastData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e94560" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#e94560" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
              <XAxis dataKey="day" stroke="#8b8b9e" />
              <YAxis stroke="#8b8b9e" domain={['dataMin - 50', 'dataMax + 50']} />
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '8px' }}
                formatter={(value) => `RM ${value}`}
              />
              <Area 
                type="monotone" 
                dataKey="predicted" 
                stroke="#e94560" 
                strokeWidth={2}
                fill="url(#colorPredicted)" 
                name="Predicted Sales"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Predictions;
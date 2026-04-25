import { useApp } from '../context/AppContext';
import './ExternalData.css';

const ExternalData = () => {
  const { config } = useApp();

  const mockTrendData = [
    { term: 'Milo', search: 85, change: '+85%' },
    { term: 'Nescafe', search: 72, change: '+72%' },
    { term: 'Maggi', search: 45, change: '+45%' },
    { term: 'Biscuit', search: 32, change: '+32%' },
    { term: 'Tea', search: 28, change: '+28%' }
  ];

  const mockWeatherData = [
    { day: 'Mon', temp: 32, condition: '☀️' },
    { day: 'Tue', temp: 31, condition: '⛅' },
    { day: 'Wed', temp: 30, condition: '🌧️' },
    { day: 'Thu', temp: 31, condition: '☀️' },
    { day: 'Fri', temp: 32, condition: '☀️' },
    { day: 'Sat', temp: 33, condition: '☀️' },
    { day: 'Sun', temp: 32, condition: '⛅' }
  ];

  const mockHolidays = [
    { date: '2026-04-20', name: 'School Holidays', type: 'school' },
    { date: '2026-04-29', name: 'Hari Raya', type: 'public' },
    { date: '2026-04-30', name: 'Hari Raya Holiday', type: 'public' }
  ];

  const mockBenchmarks = [
    { metric: 'Avg daily sales', value: 'RM350' },
    { metric: 'Growth YoY', value: '+12%' },
    { metric: 'Peak hours', value: '6-9 PM' },
    { metric: 'Popular category', value: 'Beverages' }
  ];

  return (
    <div className="external-data">
      <header className="page-header">
        <h1>External Data</h1>
        <p>Auto-fetched external signals for business intelligence</p>
      </header>

      <div className="external-grid">
        {/* Google Trends */}
        <div className="external-card">
          <div className="card-header">
            <h2>🔍 Google Trends</h2>
            <span className={`status ${config.externalApis.googleTrends ? 'active' : 'inactive'}`}>
              {config.externalApis.googleTrends ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="card-desc">Search popularity for items in your area</p>
          
          <div className="trend-list">
            {mockTrendData.map((item, idx) => (
              <div key={idx} className="trend-item">
                <div className="trend-term">{item.term}</div>
                <div className="trend-bar-container">
                  <div className="trend-bar" style={{ width: `${item.search}%` }}></div>
                </div>
                <div className="trend-change positive">{item.change}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weather */}
        <div className="external-card">
          <div className="card-header">
            <h2>🌤️ Weather</h2>
            <span className={`status ${config.externalApis.weather ? 'active' : 'inactive'}`}>
              {config.externalApis.weather ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="card-desc">7-day forecast affecting foot traffic</p>
          
          <div className="weather-list">
            {mockWeatherData.map((day, idx) => (
              <div key={idx} className="weather-item">
                <span className="weather-day">{day.day}</span>
                <span className="weather-icon">{day.condition}</span>
                <span className="weather-temp">{day.temp}°C</span>
              </div>
            ))}
          </div>
        </div>

        {/* Holidays */}
        <div className="external-card">
          <div className="card-header">
            <h2>📅 Holidays</h2>
            <span className={`status ${config.externalApis.publicHolidays ? 'active' : 'inactive'}`}>
              {config.externalApis.publicHolidays ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="card-desc">Public & school holidays</p>
          
          <div className="holiday-list">
            {mockHolidays.map((holiday, idx) => (
              <div key={idx} className="holiday-item">
                <span className={`holiday-type ${holiday.type}`}>
                  {holiday.type === 'public' ? 'Public' : 'School'}
                </span>
                <span className="holiday-name">{holiday.name}</span>
                <span className="holiday-date">{holiday.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Benchmarks */}
        <div className="external-card">
          <div className="card-header">
            <h2>📊 Industry Benchmarks</h2>
            <span className={`status ${config.externalApis.industryBenchmarks ? 'active' : 'inactive'}`}>
              {config.externalApis.industryBenchmarks ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="card-desc">Mini market industry averages</p>
          
          <div className="benchmark-list">
            {mockBenchmarks.map((b, idx) => (
              <div key={idx} className="benchmark-item">
                <span>{b.metric}</span>
                <span className="benchmark-value">{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="ai-insight">
        <h3>🤖 AI Insight</h3>
        <p>
          Based on external data: Milo search +85%, weather clear for the week, upcoming school holidays Apr 20.
          <strong>Recommendation: Stock up 30% on beverages, expect +25% traffic during holidays.</strong>
        </p>
      </div>
    </div>
  );
};

export default ExternalData;
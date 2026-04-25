import { useApp } from '../context/AppContext';
import './Configuration.css';

const Configuration = () => {
  const { config, setConfig, businessType, setBusinessType } = useApp();

  const businessTypes = [
    { value: 'mini-market', label: 'Mini Market', desc: 'Convenience stores, kedai runcit' },
    { value: 'retail', label: 'Retail', desc: 'Shops, e-commerce' },
    { value: 'food-hospitality', label: 'Food & Hospitality', desc: 'Restaurants, cafe' },
    { value: 'services', label: 'Services', desc: 'Salon, workshop' }
  ];

  const apiToggles = [
    { key: 'googleTrends', label: 'Google Trends', desc: 'Search popularity' },
    { key: 'weather', label: 'Weather', desc: 'Forecast data' },
    { key: 'schoolHolidays', label: 'School Holidays', desc: 'School breaks' },
    { key: 'publicHolidays', label: 'Public Holidays', desc: 'Public holidays' },
    { key: 'economicIndicators', label: 'Economic Data', desc: 'CPI, trends' },
    { key: 'industryBenchmarks', label: 'Industry Benchmarks', desc: 'Market data' }
  ];

  const forecastOptions = [
    { value: 7, label: '7 Days' },
    { value: 14, label: '14 Days' },
    { value: 30, label: '30 Days' }
  ];

  const toggleApi = (key) => {
    setConfig({
      ...config,
      externalApis: { ...config.externalApis, [key]: !config.externalApis[key] }
    });
  };

  return (
    <div className="configuration">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Configure your business and preferences</p>
      </header>

      <section className="config-section">
        <h2>Business Type</h2>
        <div className="template-grid">
          {businessTypes.map(b => (
            <div 
              key={b.value}
              className={`template-card ${businessType === b.value ? 'selected' : ''}`}
              onClick={() => setBusinessType(b.value)}
            >
              <h3>{b.label}</h3>
              <p>{b.desc}</p>
              {businessType === b.value && <span className="check-mark">✓</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="config-section">
        <h2>External Data Sources</h2>
        <p className="desc">Toggle which data sources to auto-fetch</p>
        <div className="api-grid">
          {apiToggles.map(api => (
            <div key={api.key} className="api-card">
              <div className="api-info">
                <h3>{api.label}</h3>
                <p>{api.desc}</p>
              </div>
              <label className="toggle">
                <input 
                  type="checkbox" 
                  checked={config.externalApis[api.key]}
                  onChange={() => toggleApi(api.key)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="config-section">
        <h2>Forecast Settings</h2>
        <div className="forecast-options">
          {forecastOptions.map(opt => (
            <button
              key={opt.value}
              className={config.forecastDays === opt.value ? 'active' : ''}
              onClick={() => setConfig({ ...config, forecastDays: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="config-section">
        <h2>Currency</h2>
        <select 
          value={config.currency}
          onChange={(e) => setConfig({ ...config, currency: e.target.value })}
          className="currency-select"
        >
          <option value="RM">RM (Malaysia)</option>
          <option value="$">$ (USD)</option>
          <option value="S$">S$ (Singapore)</option>
        </select>
      </section>
    </div>
  );
};

export default Configuration;
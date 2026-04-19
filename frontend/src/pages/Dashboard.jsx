import { useApp } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const { backendStatus, businessType, internalData, analysisResults } = useApp();

  const mockSalesData = [
    { date: 'Apr 13', sales: 420, expense: 180 },
    { date: 'Apr 14', sales: 380, expense: 150 },
    { date: 'Apr 15', sales: 520, expense: 220 },
    { date: 'Apr 16', sales: 470, expense: 190 },
    { date: 'Apr 17', sales: 550, expense: 200 },
    { date: 'Apr 18', sales: 490, expense: 180 },
    { date: 'Apr 19', sales: 320, expense: 150 },
  ];

  const mockTopProducts = [
    { name: 'Milo 50g', qty: 120 },
    { name: 'Maggi', qty: 95 },
    { name: 'Biscuit', qty: 88 },
    { name: 'Power', qty: 65 },
    { name: 'Tea', qty: 52 },
  ];

  const mockForecast = [
    { day: 'Tomorrow', predicted: 380, range: '350-410' },
    { day: 'Day 2', predicted: 420, range: '380-450' },
    { day: 'Day 3', predicted: 390, range: '360-420' },
  ];

  const businessLabels = {
    'mini-market': 'Mini Market',
    'food-hospitality': 'Food & Hospitality',
    'retail': 'Retail',
    'services': 'Services'
  };

  const totalSales = mockSalesData.reduce((sum, d) => sum + d.sales, 0);
  const totalExpense = mockSalesData.reduce((sum, d) => sum + d.expense, 0);
  const profit = totalSales - totalExpense;
  const profitMargin = Math.round((profit / totalSales) * 100);

  return (
    <div className="dashboard">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>AI-powered business intelligence for {businessLabels[businessType]}</p>
      </header>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>System Status</h3>
          <div className={`status-badge ${backendStatus}`}>
            {backendStatus === 'ok' ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="stat-card">
          <h3>Today Sales</h3>
          <p className="stat-value">RM {mockSalesData[mockSalesData.length-1].sales}</p>
        </div>
        <div className="stat-card">
          <h3>7-Day Revenue</h3>
          <p className="stat-value">RM {totalSales}</p>
        </div>
        <div className="stat-card">
          <h3>Profit Margin</h3>
          <p className={`stat-value ${profitMargin > 30 ? 'positive' : 'negative'}`}>{profitMargin}%</p>
        </div>
      </div>

      {/* Output Categories */}
      <div className="output-categories">
        <div className="category-card analysis">
          <span className="cat-icon">📊</span>
          <div className="cat-content">
            <h3>Data Analysis</h3>
            <p>Sales trends, top products, MoM comparison</p>
          </div>
        </div>
        <div className="category-card predictions">
          <span className="cat-icon">🔮</span>
          <div className="cat-content">
            <h3>Predictions</h3>
            <p>7-day forecast, trends, seasonality</p>
          </div>
        </div>
        <div className="category-card actions">
          <span className="cat-icon">✅</span>
          <div className="cat-content">
            <h3>Action Suggestions</h3>
            <p>Inventory alerts, recommendations</p>
          </div>
        </div>
        <div className="category-card ai">
          <span className="cat-icon">��</span>
          <div className="cat-content">
            <h3>AI Assumptions</h3>
            <p>What-if analysis, ask AI</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Sales & Expenses Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mockSalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
              <XAxis dataKey="date" stroke="#8b8b9e" />
              <YAxis stroke="#8b8b9e" />
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => `RM ${value}`}
              />
              <Line type="monotone" dataKey="sales" stroke="#e94560" strokeWidth={2} name="Sales" />
              <Line type="monotone" dataKey="expense" stroke="#4ade80" strokeWidth={2} name="Expense" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Top Products (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockTopProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
              <XAxis type="number" stroke="#8b8b9e" />
              <YAxis dataKey="name" type="category" stroke="#8b8b9e" width={80} />
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '8px' }}
                formatter={(value) => `${value} units`}
              />
              <Bar dataKey="qty" fill="#e94560" radius={[0, 4, 4, 0]} name="Qty Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Forecast */}
      <div className="forecast-section">
        <h3>🔮 7-Day Forecast</h3>
        <div className="forecast-grid">
          {mockForecast.map((f, idx) => (
            <div key={idx} className="forecast-card">
              <span className="forecast-day">{f.day}</span>
              <span className="forecast-value">RM {f.predicted}</span>
              <span className="forecast-range">{f.range}</span>
            </div>
          ))}
          <div className="forecast-card more">
            <span>View All</span>
            <a href="/predictions">→</a>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h3>✅ Quick Actions</h3>
        <div className="actions-list">
          <div className="action-item warning">
            <span className="action-icon">⚠️</span>
            <span className="action-text">Milo low stock - reorder tomorrow</span>
          </div>
          <div className="action-item info">
            <span className="action-icon">🔔</span>
            <span className="action-text">Tuesday sales -40% below avg</span>
          </div>
          <div className="action-item new">
            <span className="action-icon">🔥</span>
            <span className="action-text">Nescafe trending +85% - consider stocking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
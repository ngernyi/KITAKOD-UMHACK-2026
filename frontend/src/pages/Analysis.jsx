import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import './Analysis.css';

const Analysis = () => {
  const { internalData, isLoading } = useApp();
  const [dateRange, setDateRange] = useState('7d');

  const mockSalesData = [
    { date: 'Apr 13', sales: 420, expense: 180 },
    { date: 'Apr 14', sales: 380, expense: 150 },
    { date: 'Apr 15', sales: 520, expense: 220 },
    { date: 'Apr 16', sales: 470, expense: 190 },
    { date: 'Apr 17', sales: 550, expense: 200 },
    { date: 'Apr 18', sales: 490, expense: 180 },
    { date: 'Apr 19', sales: 320, expense: 150 },
  ];

  const mockCategoryData = [
    { name: 'Beverages', value: 45 },
    { name: 'Snacks', value: 25 },
    { name: 'Groceries', value: 20 },
    { name: 'Household', value: 10 },
  ];

  const mockTopProducts = [
    { name: 'Milo 50g', qty: 120, margin: 30 },
    { name: 'Maggi', qty: 95, margin: 28 },
    { name: 'Biscuit', qty: 88, margin: 25 },
    { name: 'Power', qty: 65, margin: 35 },
    { name: 'Tea', qty: 52, margin: 22 },
  ];

  const mockExpenseBreakdown = [
    { name: 'Rent', amount: 1500 },
    { name: 'Restock', amount: 800 },
    { name: 'Utilities', amount: 200 },
    { name: 'Staff', amount: 0 },
  ];

  const COLORS = ['#e94560', '#4ade80', '#3b82f6', '#f59e0b'];

  const totalSales = mockSalesData.reduce((sum, d) => sum + d.sales, 0);
  const totalExpense = mockSalesData.reduce((sum, d) => sum + d.expense, 0);
  const profit = totalSales - totalExpense;
  const momChange = 15; // Mock MoM

  return (
    <div className="analysis">
      <header className="page-header">
        <h1>Data Analysis</h1>
        <p>Understand your business performance</p>
      </header>

      {/* Date Range Selector */}
      <div className="range-selector">
        <button className={dateRange === '7d' ? 'active' : ''} onClick={() => setDateRange('7d')}>7 Days</button>
        <button className={dateRange === '30d' ? 'active' : ''} onClick={() => setDateRange('30d')}>30 Days</button>
        <button className={dateRange === '90d' ? 'active' : ''} onClick={() => setDateRange('90d')}>90 Days</button>
      </div>

      {/* Summary Stats */}
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Total Revenue</h3>
          <p className="value">RM {totalSales}</p>
          <span className={`change ${momChange > 0 ? 'positive' : 'negative'}`}>
            {momChange > 0 ? '+' : ''}{momChange}% vs last period
          </span>
        </div>
        <div className="summary-card">
          <h3>Total Expenses</h3>
          <p className="value">RM {totalExpense}</p>
        </div>
        <div className="summary-card">
          <h3>Net Profit</h3>
          <p className={`value ${profit > 0 ? 'positive' : 'negative'}`}>RM {profit}</p>
        </div>
        <div className="summary-card">
          <h3>Profit Margin</h3>
          <p className="value">{Math.round((profit/totalSales)*100)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Sales & Expenses Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mockSalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
              <XAxis dataKey="date" stroke="#8b8b9e" />
              <YAxis stroke="#8b8b9e" />
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '8px' }}
                formatter={(value) => `RM ${value}`}
              />
              <Line type="monotone" dataKey="sales" stroke="#e94560" strokeWidth={2} name="Sales" />
              <Line type="monotone" dataKey="expense" stroke="#4ade80" strokeWidth={2} name="Expense" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Sales by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={mockCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {mockCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '8px' }}
                formatter={(value) => `${value}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Top Products by Quantity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockTopProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
              <XAxis type="number" stroke="#8b8b9e" />
              <YAxis dataKey="name" type="category" stroke="#8b8b9e" width={80} />
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '8px' }}
              />
              <Bar dataKey="qty" fill="#e94560" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Top Products by Margin</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockTopProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
              <XAxis type="number" stroke="#8b8b9e" unit="%" />
              <YAxis dataKey="name" type="category" stroke="#8b8b9e" width={80} />
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '8px' }}
                formatter={(value) => `${value}%`}
              />
              <Bar dataKey="margin" fill="#4ade80" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="alerts-section">
        <h3>⚠️ Alerts</h3>
        <div className="alerts-list">
          <div className="alert-item warning">
            <span>Tuesday sales -40% below average</span>
            <span className="alert-action">Consider running promotions</span>
          </div>
          <div className="alert-item info">
            <span>Profit margin this week: {Math.round((profit/totalSales)*100)}%</span>
            <span className="alert-action">Healthy margin</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
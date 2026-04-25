import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Actions.css';

const Actions = () => {
  const navigate = useNavigate();
  const { internalData } = useApp();
  const [checkedItems, setCheckedItems] = useState([]);

  const defaultActions = [
    { id: 1, text: 'Reorder Milo - current stock below reorder level', priority: 'high', category: 'inventory' },
    { id: 2, text: 'Consider Tuesday promotion - sales consistently low', priority: 'medium', category: 'sales' },
    { id: 3, text: 'Stock more Nescafe - trending +85% in searches', priority: 'high', category: 'trend' },
    { id: 4, text: 'Review pricing for high-margin items (Power: 35%)', priority: 'medium', category: 'pricing' },
    { id: 5, text: 'Prepare for Ramadan peak - +45% expected', priority: 'medium', category: 'seasonal' },
    { id: 6, text: 'Check low stock items in inventory', priority: 'high', category: 'inventory' },
    { id: 7, text: 'Analyze weekend sales performance', priority: 'low', category: 'sales' },
    { id: 8, text: 'Update pricing for underperforming items', priority: 'medium', category: 'pricing' },
    { id: 9, text: 'Review supplier lead times', priority: 'low', category: 'inventory' },
    { id: 10, text: 'Plan marketing for upcoming holiday', priority: 'medium', category: 'seasonal' },
  ];

  const marginRecommendations = [
    { item: 'Power', margin: 35, suggestion: 'Consider price increase' },
    { item: 'Milo 50g', margin: 30, suggestion: 'Healthy margin - maintain' },
    { item: 'Maggi', margin: 28, suggestion: 'OK margin' },
    { item: 'Tea', margin: 22, suggestion: 'Review cost' },
    { item: 'Coffee', margin: 32, suggestion: 'Good margin' },
    { item: 'Sugar', margin: 18, suggestion: 'Low margin - review' },
  ];

  const toggleItem = (id) => {
    if (checkedItems.includes(id)) {
      setCheckedItems(checkedItems.filter(item => item !== id));
    } else {
      setCheckedItems([...checkedItems, id]);
    }
  };

  const priorityColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6'
  };

  const categoryIcons = {
    inventory: '📦',
    sales: '💰',
    trend: '🔥',
    pricing: '🏷️',
    seasonal: '📅'
  };

  const completed = checkedItems.length;
  const total = defaultActions.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const inventoryActions = defaultActions.filter(a => a.category === 'inventory').slice(0, 3);
  const salesActions = defaultActions.filter(a => a.category === 'sales').slice(0, 3);
  const trendActions = defaultActions.filter(a => a.category === 'trend' || a.category === 'seasonal').slice(0, 3);

  return (
    <div className="actions">
      <header className="page-header">
        <h1>Action Suggestions</h1>
        <p>AI-powered recommendations for your business</p>
      </header>

      {/* Progress */}
      <div className="progress-section-compact">
        <div className="progress-info">
          <span className="progress-label">Progress</span>
          <span className="progress-text">{completed}/{total} completed</span>
        </div>
        <div className="progress-bar-compact">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* 3 Compact Boxes */}
      <div className="actions-grid-compact">
        {/* Inventory Box */}
        <div className="action-box">
          <div className="box-header">
            <span className="box-icon">📦</span>
            <h3>Inventory Alerts</h3>
            <button className="view-more-btn" onClick={() => navigate('/actions/inventory')}>
              View All →
            </button>
          </div>
          <div className="box-list">
            {inventoryActions.map(action => (
              <div 
                key={action.id} 
                className={`compact-action-card ${checkedItems.includes(action.id) ? 'checked' : ''}`}
              >
                <label className="checkbox-small">
                  <input
                    type="checkbox"
                    checked={checkedItems.includes(action.id)}
                    onChange={() => toggleItem(action.id)}
                  />
                  <span className="checkmark"></span>
                </label>
                <span className="action-text">{action.text}</span>
                <span className="priority-dot" style={{ background: priorityColors[action.priority] }}></span>
              </div>
            ))}
          </div>
        </div>

        {/* Sales Box */}
        <div className="action-box">
          <div className="box-header">
            <span className="box-icon">💰</span>
            <h3>Sales</h3>
            <button className="view-more-btn" onClick={() => navigate('/actions/sales')}>
              View All →
            </button>
          </div>
          <div className="box-list">
            {salesActions.map(action => (
              <div 
                key={action.id} 
                className={`compact-action-card ${checkedItems.includes(action.id) ? 'checked' : ''}`}
              >
                <label className="checkbox-small">
                  <input
                    type="checkbox"
                    checked={checkedItems.includes(action.id)}
                    onChange={() => toggleItem(action.id)}
                  />
                  <span className="checkmark"></span>
                </label>
                <span className="action-text">{action.text}</span>
                <span className="priority-dot" style={{ background: priorityColors[action.priority] }}></span>
              </div>
            ))}
          </div>
        </div>

        {/* Trending & Seasonal Box */}
        <div className="action-box">
          <div className="box-header">
            <span className="box-icon">🔥</span>
            <h3>Trends & Seasonal</h3>
            <button className="view-more-btn" onClick={() => navigate('/actions/trends')}>
              View All →
            </button>
          </div>
          <div className="box-list">
            {trendActions.map(action => (
              <div 
                key={action.id} 
                className={`compact-action-card ${checkedItems.includes(action.id) ? 'checked' : ''}`}
              >
                <label className="checkbox-small">
                  <input
                    type="checkbox"
                    checked={checkedItems.includes(action.id)}
                    onChange={() => toggleItem(action.id)}
                  />
                  <span className="checkmark"></span>
                </label>
                <span className="action-text">{action.text}</span>
                <span className="priority-dot" style={{ background: priorityColors[action.priority] }}></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Margin Compact */}
      <div className="margin-compact">
        <div className="margin-header">
          <span className="box-icon">🏷️</span>
          <h3>Margin Review</h3>
          <button className="view-more-btn" onClick={() => navigate('/actions/margins')}>
            View All →
          </button>
        </div>
        <div className="margin-grid-compact">
          {marginRecommendations.slice(0, 6).map((m, idx) => (
            <div key={idx} className="margin-mini-card">
              <span className="item-name">{m.item}</span>
              <span className={`margin-value ${m.margin >= 30 ? 'good' : m.margin < 25 ? 'low' : 'ok'}`}>
                {m.margin}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Actions;
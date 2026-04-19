import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './Actions.css';

const Actions = () => {
  const { internalData } = useApp();
  const [checkedItems, setCheckedItems] = useState([]);

  const defaultActions = [
    { id: 1, text: 'Reorder Milo - current stock below reorder level', priority: 'high', category: 'inventory' },
    { id: 2, text: 'Consider Tuesday promotion - sales consistently low', priority: 'medium', category: 'sales' },
    { id: 3, text: 'Stock more Nescafe - trending +85% in searches', priority: 'high', category: 'trend' },
    { id: 4, text: 'Review pricing for high-margin items (Power: 35%)', priority: 'medium', category: 'pricing' },
    { id: 5, text: 'Prepare for Ramadan peak - +45% expected', priority: 'medium', category: 'seasonal' },
  ];

  const marginRecommendations = [
    { item: 'Power', margin: 35, suggestion: 'Consider price increase' },
    { item: 'Milo 50g', margin: 30, suggestion: 'Healthy margin - maintain' },
    { item: 'Maggi', margin: 28, suggestion: 'OK margin' },
    { item: 'Tea', margin: 22, suggestion: 'Review cost' },
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

  return (
    <div className="actions">
      <header className="page-header">
        <h1>Action Suggestions</h1>
        <p>AI-powered recommendations for your business</p>
      </header>

      {/* Progress */}
      <div className="progress-section">
        <div className="progress-info">
          <h3>Action Progress</h3>
          <p>{completed} of {total} completed</p>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="progress-percent">{progress}%</span>
      </div>

      {/* Inventory Alerts */}
      <div className="actions-section">
        <h3>📦 Inventory Alerts</h3>
        <div className="actions-list">
          {defaultActions.filter(a => a.category === 'inventory').map(action => (
            <div 
              key={action.id} 
              className={`action-card ${checkedItems.includes(action.id) ? 'checked' : ''}`}
            >
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={checkedItems.includes(action.id)}
                  onChange={() => toggleItem(action.id)}
                />
                <span className="checkmark"></span>
              </label>
              <span className="action-text">{action.text}</span>
              <span className="priority" style={{ background: priorityColors[action.priority] }}>
                {action.priority}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sales Recommendations */}
      <div className="actions-section">
        <h3>💰 Sales Recommendations</h3>
        <div className="actions-list">
          {defaultActions.filter(a => a.category === 'sales').map(action => (
            <div 
              key={action.id} 
              className={`action-card ${checkedItems.includes(action.id) ? 'checked' : ''}`}
            >
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={checkedItems.includes(action.id)}
                  onChange={() => toggleItem(action.id)}
                />
                <span className="checkmark"></span>
              </label>
              <span className="action-text">{action.text}</span>
              <span className="priority" style={{ background: priorityColors[action.priority] }}>
                {action.priority}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="actions-section">
        <h3>🔥 Trending Items</h3>
        <div className="actions-list">
          {defaultActions.filter(a => a.category === 'trend').map(action => (
            <div 
              key={action.id} 
              className={`action-card highlight ${checkedItems.includes(action.id) ? 'checked' : ''}`}
            >
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={checkedItems.includes(action.id)}
                  onChange={() => toggleItem(action.id)}
                />
                <span className="checkmark"></span>
              </label>
              <span className="action-text">{action.text}</span>
              <span className="priority" style={{ background: priorityColors[action.priority] }}>
                {action.priority}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Margin Recommendations */}
      <div className="margin-section">
        <h3>🏷️ Margin Recommendations</h3>
        <div className="margin-list">
          {marginRecommendations.map((m, idx) => (
            <div key={idx} className="margin-card">
              <span className="item-name">{m.item}</span>
              <span className="margin-value">{m.margin}%</span>
              <span className={`suggestion ${m.margin >= 30 ? 'good' : m.margin < 25 ? 'review' : 'ok'}`}>
                {m.suggestion}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal */}
      <div className="actions-section">
        <h3>📅 Seasonal</h3>
        <div className="actions-list">
          {defaultActions.filter(a => a.category === 'seasonal').map(action => (
            <div 
              key={action.id} 
              className={`action-card ${checkedItems.includes(action.id) ? 'checked' : ''}`}
            >
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={checkedItems.includes(action.id)}
                  onChange={() => toggleItem(action.id)}
                />
                <span className="checkmark"></span>
              </label>
              <span className="action-text">{action.text}</span>
              <span className="priority" style={{ background: priorityColors[action.priority] }}>
                {action.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Actions;
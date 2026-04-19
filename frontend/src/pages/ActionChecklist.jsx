import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './ActionChecklist.css';

const ActionChecklist = () => {
  const { predictionResults, industryTemplate, celebrationType } = useApp();
  const [checkedItems, setCheckedItems] = useState([]);

  const defaultActions = predictionResults?.actionItems || [
    { text: 'Configure industry template in Configuration page', priority: 'high' },
    { text: 'Add sales history data in Data Input page', priority: 'high' },
    { text: 'Run demand prediction in Results page', priority: 'high' }
  ];

  const toggleItem = (text) => {
    if (checkedItems.includes(text)) {
      setCheckedItems(checkedItems.filter(item => item !== text));
    } else {
      setCheckedItems([...checkedItems, text]);
    }
  };

  const industryLabels = {
    'food-hospitality': 'Food & Hospitality',
    'retail': 'Retail',
    'services': 'Services'
  };

  const celebrationLabels = {
    'raya': 'Hari Raya',
    'cny': 'Chinese New Year',
    'deepavali': 'Deepavali',
    'christmas': 'Christmas',
    'weddings': 'Weddings',
    'all': 'All Celebrations'
  };

  const priorityColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6'
  };

  const completed = checkedItems.length;
  const total = defaultActions.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="action-checklist">
      <header className="page-header">
        <h1>Action Checklist</h1>
        <p>Concrete tasks based on AI predictions</p>
      </header>

      <div className="checklist-summary">
        <div className="summary-card">
          <h3>Overall Progress</h3>
          <div className="progress-circle">
            <svg viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#2d2d4a"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e94560"
                strokeWidth="3"
                strokeDasharray={`${progress}, 100`}
              />
            </svg>
            <span className="progress-text">{progress}%</span>
          </div>
          <p>{completed} of {total} tasks completed</p>
        </div>

        <div className="summary-card">
          <h3>Quick Stats</h3>
          <div className="stats-list">
            <div className="stat-row">
              <span>Industry</span>
              <span>{industryLabels[industryTemplate]}</span>
            </div>
            <div className="stat-row">
              <span>Celebration</span>
              <span>{celebrationLabels[celebrationType]}</span>
            </div>
            <div className="stat-row">
              <span>Prediction</span>
              <span>{predictionResults ? `${predictionResults.forecast} units` : 'Not run'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="checklist-section">
        <h2>Recommended Actions</h2>
        <div className="checklist-list">
          {defaultActions.map((action, idx) => (
            <div 
              key={idx} 
              className={`checklist-item ${checkedItems.includes(action.text) ? 'checked' : ''}`}
            >
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={checkedItems.includes(action.text)}
                  onChange={() => toggleItem(action.text)}
                />
                <span className="checkmark"></span>
              </label>
              <div className="item-content">
                <span className="item-text">{action.text}</span>
                <span 
                  className="priority-badge"
                  style={{ background: priorityColors[action.priority] }}
                >
                  {action.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {predictionResults && predictionResults.actionItems && (
        <div className="checklist-section">
          <h2>AI-Generated Tasks</h2>
          <div className="checklist-list">
            {predictionResults.actionItems.map((action, idx) => (
              <div 
                key={idx} 
                className={`checklist-item ai-task ${checkedItems.includes(action.text) ? 'checked' : ''}`}
              >
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={checkedItems.includes(action.text)}
                    onChange={() => toggleItem(action.text)}
                  />
                  <span className="checkmark"></span>
                </label>
                <div className="item-content">
                  <span className="item-text">{action.text}</span>
                  <span 
                    className="priority-badge"
                    style={{ background: priorityColors[action.priority] }}
                  >
                    {action.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionChecklist;
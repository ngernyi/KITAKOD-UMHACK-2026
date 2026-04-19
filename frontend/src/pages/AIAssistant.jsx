import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import './AIAssistant.css';

const AIAssistant = () => {
  const { isLoading, setIsLoading, internalData, config } = useApp();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('whatif');
  const [history, setHistory] = useState([
    { type: 'whatif', question: 'What if I raise prices by 10%?', answer: 'Based on your current margin of 30% and price elasticity, raising prices by 10% would increase profit by approximately RM800-1000/month. However, monitor for any drop in volume.', timestamp: '2026-04-19' },
    { type: 'ask', question: 'Why are Tuesday sales always low?', answer: 'Tuesday typically has 40% lower foot traffic. This could be due to: 1) Mid-week routine 2) Competitor promotions on other days. Consider running Tuesday specials.', timestamp: '2026-04-18' }
  ]);

  // Check tier maturity
  const checkTierAccess = () => {
    const hasBasic = internalData.sales.length > 0 && internalData.expenses.length > 0;
    const hasIntermediate = internalData.products.length > 0 && internalData.inventory.length > 0;
    const hasAdvanced = internalData.staff.length > 0 && internalData.suppliers.length > 0;

    if (hasAdvanced) return 'advanced';
    if (hasIntermediate) return 'intermediate';
    if (hasBasic) return 'basic';
    return 'none';
  };

  const tierAccess = checkTierAccess();

  const whatIfTemplates = [
    { q: 'What if I raise prices by 10%?', desc: 'See profit impact' },
    { q: 'What if I hire one more staff?', desc: 'Labor cost analysis' },
    { q: 'What if I restock now vs wait?', desc: 'Inventory timing' },
    { q: 'What if I run a promotion?', desc: 'Sales impact' },
    { q: 'What if I add new product?', desc: 'New item analysis' },
    { q: 'What if I reduce hours?', desc: 'Cost savings' },
  ];

  const askTemplates = [
    { q: 'Why are sales dropping?', desc: 'Diagnose issue' },
    { q: 'What products should I stock more?', desc: 'Recommendations' },
    { q: 'When is my peak season?', desc: 'Seasonality' },
    { q: 'Am I making profit?', desc: 'Profitability' },
    { q: 'How can I improve margin?', desc: 'Optimization' },
    { q: 'What is my best seller?', desc: 'Top products' },
  ];

  const generateResponse = (type, question) => {
    if (type === 'whatif') {
      const lowerQ = question.toLowerCase();
      if (lowerQ.includes('raise price') || lowerQ.includes('increase price')) {
        return `Based on your data:\n\n• Current margin: ~30%\n• Price increase 10% = ~RM800-1000/month extra profit\n• Risk: May lose some price-sensitive customers\n\nRecommendation: Try on high-margin items first (Power: 35%, Milo: 30%)`;
      }
      if (lowerQ.includes('hire') || lowerQ.includes('staff')) {
        return `Based on your staff data:\n\n• Current staff cost: RM${internalData.staff.reduce((sum, s) => sum + (s.count * s.wage), 0)}/month\n• New hire: +RM1500/month\n• Break-even: Need RM{1500/0.3} more revenue/month\n\nRecommendation: Only hire if you can guarantee additional sales`;
      }
      if (lowerQ.includes('restock') || lowerQ.includes('inventory')) {
        return `Analysis based on your inventory levels:\n\n• ${internalData.inventory.filter(i => i.quantity <= i.reorderLevel).length} items at reorder level\n• Lead time: 2-3 days typical\n\nRecommendation: Stock NOW for trending items (Milo +85%, Nescafe +72%)`;
      }
      return 'Based on your business data: This change would result in approximately X. Consider the trade-offs: Pros include improved margins, Cons include potential volume decrease.';
    } else {
      const lowerQ = question.toLowerCase();
      if (lowerQ.includes('drop') || lowerQ.includes('low')) {
        return `Analysis of your sales data:\n\n• Tuesday is your lowest day (-40% below avg)\n• Pattern: consistently low mid-week\n• External factors: Weather may affect foot traffic\n\nAction: Run Tuesday promotions to boost traffic`;
      }
      if (lowerQ.includes('stock') || lowerQ.includes('what')) {
        return `Based on your data + Google Trends:\n\n• Milo: Trending +85% - STOCK NOW\n• Nescafe: Trending +72% - Order extra\n• Maggi: Stable - maintain current level\n\nRecommendation: Prioritize trending items`;
      }
      if (lowerQ.includes('profit') || lowerQ.includes('making')) {
        const totalRevenue = internalData.sales.reduce((sum, s) => sum + (parseFloat(s.revenue) || 0), 0);
        const totalExpenses = internalData.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const profit = totalRevenue - totalExpenses;
        const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;
        return `Your financial snapshot:\n\n• Revenue: RM${totalRevenue}\n• Expenses: RM${totalExpenses}\n• Profit: RM${profit} (${margin}%)\n\nStatus: ${margin >= 30 ? 'Healthy ✅' : margin >= 20 ? 'OK ⚠️' : 'Needs attention ❌'}`;
      }
      return 'Based on your business data: The analysis shows that sales patterns indicate moderate performance. Consider focusing on high-margin products and trending items.';
    }
  };

  const submitQuery = (type) => {
    if (!query.trim()) return;
    setIsLoading(true);

    setTimeout(() => {
      const answer = generateResponse(type, query);
      setHistory([{ type, question: query, answer, timestamp: new Date().toISOString().split('T')[0] }, ...history]);
      setQuery('');
      setIsLoading(false);
    }, 1000);
  };

  const selectTemplate = (q) => setQuery(q);

  return (
    <div className="ai-assistant">
      <header className="page-header">
        <h1>AI Assistant</h1>
        <p>Ask what-if questions and get AI-powered business insights</p>
      </header>

      {/* Tier Access Notice */}
      {tierAccess === 'none' && (
        <div className="tier-notice warning">
          <span className="badge">⚠️ Limited Access</span>
          <p>Add sales and expense data to unlock AI features</p>
        </div>
      )}
      {tierAccess === 'basic' && (
        <div className="tier-notice">
          <span className="badge">Basic</span>
          <p>Add products & inventory for more insights | Add staff for What-if</p>
        </div>
      )}
      {tierAccess === 'intermediate' && (
        <div className="tier-notice">
          <span className="badge intermediate">Intermediate</span>
          <p>Add staff & suppliers for full What-if analysis</p>
        </div>
      )}
      {tierAccess === 'advanced' && (
        <div className="tier-notice success">
          <span className="badge advanced">Advanced</span>
          <p>Full AI capabilities enabled</p>
        </div>
      )}

      {/* Query Input */}
      <div className="query-section">
        <div className="query-tabs">
          <button className={`query-tab ${activeTab === 'whatif' ? 'active' : ''}`} onClick={() => setActiveTab('whatif')}>
            🔮 What-if Analysis
          </button>
          <button className={`query-tab ${activeTab === 'ask' ? 'active' : ''}`} onClick={() => setActiveTab('ask')}>
            💬 Ask AI
          </button>
        </div>
        <div className="query-input">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeTab === 'whatif' ? "Ask: What if I raise prices by 10%?" : "Ask: Why are sales dropping?"}
            rows="3"
          />
          <div className="query-buttons">
            <button 
              className="submit-btn" 
              onClick={() => submitQuery(activeTab)}
              disabled={!query.trim() || isLoading}
            >
              {isLoading ? '🔄 Analyzing...' : activeTab === 'whatif' ? '🔮 Run What-if' : '💬 Ask AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="templates-section">
        <div className="template-group">
          <h3>🔮 What-if Templates</h3>
          <div className="template-list">
            {whatIfTemplates.map((t, idx) => (
              <button key={idx} className="template-btn" onClick={() => selectTemplate(t.q)}>
                <span className="template-q">{t.q}</span>
                <span className="template-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="template-group">
          <h3>💬 Ask Templates</h3>
          <div className="template-list">
            {askTemplates.map((t, idx) => (
              <button key={idx} className="template-btn" onClick={() => selectTemplate(t.q)}>
                <span className="template-q">{t.q}</span>
                <span className="template-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="history-section">
        <h3>📚 Previous Questions ({history.length})</h3>
        <div className="history-list">
          {history.map((item, idx) => (
            <div key={idx} className={`history-card ${item.type}`}>
              <div className="history-header">
                <span className={`type-badge ${item.type}`}>
                  {item.type === 'whatif' ? '🔮 What-if' : '💬 Ask'}
                </span>
                <span className="timestamp">{item.timestamp}</span>
              </div>
              <p className="question">{item.question}</p>
              <div className="answer">
                {item.answer.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <p className="empty">No questions yet. Use the templates above or ask your own!</p>
          )}
        </div>
      </div>

      {/* Access Required Message */}
      {tierAccess !== 'advanced' && (
        <div className="upgrade-notice">
          <h4>🔒 Advanced Features</h4>
          <p>To unlock full AI What-if analysis, add:</p>
          <ul>
            {tierAccess === 'none' && <li>Sales & Expenses data (Basic tier)</li>}
            {tierAccess !== 'advanced' && <li>Products & Inventory (Intermediate tier)</li>}
            {tierAccess !== 'advanced' && <li>Staff & Suppliers (Advanced tier)</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
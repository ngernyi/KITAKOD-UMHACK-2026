import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { askAI, getWhatIf } from '../services/api';
import './AIAssistant.css';

const formatAnswer = (text) => {
  if (!text) return [];

  const blocks = [];
  const lines = text.split('\n');
  let currentList = [];
  let listType = null;

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: listType, items: [...currentList] });
      currentList = [];
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      blocks.push({ type: 'heading', text: cleanMd(trimmed.slice(4)) });
    } else if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push({ type: 'heading', text: cleanMd(trimmed.slice(3)) });
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes(' ')) {
      flushList();
      blocks.push({ type: 'label', text: cleanMd(trimmed) });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      if (listType !== 'unordered') flushList();
      listType = 'unordered';
      currentList.push(cleanMd(trimmed.slice(2)));
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== 'ordered') flushList();
      listType = 'ordered';
      currentList.push(cleanMd(trimmed.replace(/^\d+\.\s/, '')));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      blocks.push({ type: 'paragraph', text: cleanMd(trimmed) });
    }
  }
  flushList();

  return blocks;
};

const cleanMd = (text) => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
};

const RenderBlock = ({ block, idx }) => {
  switch (block.type) {
    case 'heading':
      return <h4 className="answer-heading" key={idx}>{block.text}</h4>;
    case 'label':
      return <div className="answer-label" key={idx} dangerouslySetInnerHTML={{ __html: block.text }} />;
    case 'paragraph':
      return <p className="answer-paragraph" key={idx} dangerouslySetInnerHTML={{ __html: block.text }} />;
    case 'unordered':
      return (
        <ul className="answer-list" key={idx}>
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      );
    case 'ordered':
      return (
        <ol className="answer-list ordered" key={idx}>
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ol>
      );
    default:
      return null;
  }
};

const AIAssistant = () => {
  const { isLoading, setIsLoading, internalData, config } = useApp();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('whatif');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

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

  const submitQuery = async (type) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const businessData = {
        sales: internalData.sales,
        expenses: internalData.expenses,
        products: internalData.products,
        inventory: internalData.inventory,
        staff: internalData.staff,
        suppliers: internalData.suppliers,
      };

      let answer = '';

      if (type === 'whatif') {
        const res = await getWhatIf({ question: query, business_data: businessData });
        if (res.success) {
          const { analysis, pros, cons, recommendation } = res.result;
          answer = analysis || '';
          if (pros && pros.length > 0) {
            answer += '\n\n**Pros:**\n' + pros.map(p => `- ${p}`).join('\n');
          }
          if (cons && cons.length > 0) {
            answer += '\n\n**Cons:**\n' + cons.map(c => `- ${c}`).join('\n');
          }
          if (recommendation) {
            answer += `\n\n**Recommendation:** ${recommendation}`;
          }
        } else {
          setError(res.error || 'Failed to get analysis');
        }
      } else {
        const res = await askAI({ question: query, business_data: businessData });
        if (res.success) {
          answer = res.result.answer;
        } else {
          setError(res.error || 'Failed to get answer');
        }
      }

      if (answer) {
        const formatted = formatAnswer(answer);
        setHistory([{ type, question: query, formatted, timestamp: new Date().toISOString().split('T')[0] }, ...history]);
        setQuery('');
      }
    } catch (err) {
      setError('Connection error. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectTemplate = (q) => setQuery(q);

  return (
    <div className="ai-assistant">
      <header className="page-header">
        <h1>AI Assistant</h1>
        <p>Ask what-if questions and get AI-powered business insights</p>
      </header>

      {tierAccess === 'none' && (
        <div className="tier-notice warning">
          <span className="badge">Limited Access</span>
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

      {error && (
        <div className="tier-notice warning">
          <span className="badge">Error</span>
          <p>{error}</p>
        </div>
      )}

      <div className="query-section">
        <div className="query-tabs">
          <button className={`query-tab ${activeTab === 'whatif' ? 'active' : ''}`} onClick={() => setActiveTab('whatif')}>
            What-if Analysis
          </button>
          <button className={`query-tab ${activeTab === 'ask' ? 'active' : ''}`} onClick={() => setActiveTab('ask')}>
            Ask AI
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
              {isLoading ? 'Analyzing...' : activeTab === 'whatif' ? 'Run What-if' : 'Ask AI'}
            </button>
          </div>
        </div>
      </div>

      <div className="templates-section">
        <div className="template-group">
          <h3>{activeTab === 'whatif' ? 'What-if Templates' : 'Ask Templates'}</h3>
          <div className="template-list">
            {(activeTab === 'whatif' ? whatIfTemplates : askTemplates).map((t, idx) => (
              <button key={idx} className="template-btn" onClick={() => selectTemplate(t.q)}>
                <span className="template-q">{t.q}</span>
                <span className="template-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="history-section">
        <h3>Previous Questions ({history.length})</h3>
        <div className="history-list">
          {history.map((item, idx) => (
            <div key={idx} className={`history-card ${item.type}`}>
              <div className="history-header">
                <span className={`type-badge ${item.type}`}>
                  {item.type === 'whatif' ? 'What-if' : 'Ask'}
                </span>
                <span className="timestamp">{item.timestamp}</span>
              </div>
              <p className="question">{item.question}</p>
              <div className="answer">
                {item.formatted.map((block, i) => (
                  <RenderBlock key={i} block={block} idx={i} />
                ))}
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <p className="empty">No questions yet. Use the templates above or ask your own!</p>
          )}
        </div>
      </div>

      {tierAccess !== 'advanced' && (
        <div className="upgrade-notice">
          <h4>Advanced Features</h4>
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

import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/data', label: 'Data Input', icon: '📁', desc: 'Sales, Expenses' },
  { path: '/external', label: 'External Data', icon: '🌐', desc: 'Trends, Weather' },
  { path: '/analysis', label: 'Analysis', icon: '📈', desc: 'Data Analysis' },
  { path: '/predictions', label: 'Predictions', icon: '🔮', desc: 'Forecasts' },
  { path: '/actions', label: 'Actions', icon: '✅', desc: 'Recommendations' },
  { path: '/ai', label: 'AI Assistant', icon: '🤖', desc: 'What-if?' },
  { path: '/config', label: 'Settings', icon: '⚙️', desc: 'Configuration' }
];

const Sidebar = () => {
  const { backendStatus } = useApp();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>SME AI</h2>
        <p>Business Intelligence</p>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className={`status-dot ${backendStatus}`}></span>
          <span>Backend: {backendStatus}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
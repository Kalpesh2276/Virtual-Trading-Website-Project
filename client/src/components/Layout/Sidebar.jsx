import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Search, Briefcase, History, LogOut, TrendingUp
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import './Layout.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/search', icon: Search, label: 'Explore Stocks' },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/transactions', icon: History, label: 'Transactions' },
];

function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <TrendingUp size={24} />
        </div>
        <div>
          <h2 className="sidebar-title">TradeSAFE</h2>
          <p className="sidebar-tagline">Paper Trading</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-balance-card">
          <p className="sidebar-balance-label">Available Balance</p>
          <p className="sidebar-balance-value">{formatCurrency(user?.balance || 0)}</p>
        </div>

        <button className="sidebar-link sidebar-logout" onClick={logout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

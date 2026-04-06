import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, X, LogOut, Wallet } from 'lucide-react';
import { stockAPI } from '../../services/api';
import { getExchange, formatCurrency } from '../../utils/formatters';
import './Layout.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await stockAPI.search(query.trim());
        setSearchResults(data.slice(0, 10));
        setShowResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const selectStock = (stock) => {
    setSearchQuery('');
    setShowResults(false);
    navigate(`/stocks/${encodeURIComponent(stock.symbol)}`);
  };

  const navLinks = [
    { name: 'Explore', path: '/' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Watchlist', path: '/watchlist' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">T</div>
          <span className="logo-text">TradeSAFE</span>
        </Link>
        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-search" ref={searchRef}>
          <Search size={18} className="navbar-search-icon" />
          <input
            id="navbar-search"
            type="text"
            placeholder="Search any NSE or BSE stock..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {searchQuery && (
            <button className="navbar-search-clear" onClick={() => { setSearchQuery(''); setShowResults(false); }}>
              <X size={16} />
            </button>
          )}
          {searching && <div className="spinner spinner-sm navbar-search-spinner"></div>}

          {showResults && searchResults.length > 0 && (
            <div className="navbar-search-dropdown">
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  className="navbar-search-item"
                  onClick={() => selectStock(stock)}
                >
                  <div className="navbar-search-item-info">
                    <span className="navbar-search-item-symbol">{stock.symbol.replace(/\.(NS|BO)$/, '')}</span>
                    <span className="navbar-search-item-name">{stock.shortName}</span>
                  </div>
                  <span className={`badge ${stock.symbol.endsWith('.NS') ? 'badge-nse' : 'badge-bse'}`}>
                    {getExchange(stock.symbol)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showResults && searchResults.length === 0 && searchQuery.trim().length > 0 && !searching && (
            <div className="navbar-search-dropdown">
              <div className="navbar-search-empty">No stocks found for "{searchQuery}"</div>
            </div>
          )}
        </div>

        <div className="navbar-user">
          <div className="navbar-balance">
            <Wallet size={16} />
            <span>{formatCurrency(user?.balance || 0)}</span>
          </div>
          <div className="navbar-user-avatar" title={user?.name}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <button className="navbar-logout-btn" onClick={handleLogout} title="Log Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { stockAPI, portfolioAPI, watchlistAPI } from '../../services/api';
import {
  Wallet, TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight,
  IndianRupee, Eye, Search, Plus, X, Star, Trash2, BarChart3
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, formatChange, cleanSymbol, getExchange, getPnLClass } from '../../utils/formatters';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Market indices state
  const [indices, setIndices] = useState([]);
  const [indicesLoading, setIndicesLoading] = useState(true);

  // Watchlist state
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchData();
    fetchWatchlist();
    fetchIndices();
    const interval = setInterval(() => {
      fetchData();
      fetchWatchlist();
      fetchIndices();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const summaryRes = await portfolioAPI.getSummary();
      setPortfolioSummary(summaryRes.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndices = async () => {
    try {
      const { data } = await stockAPI.getIndices();
      setIndices(data);
    } catch (err) {
      console.error('Indices fetch error:', err);
    } finally {
      setIndicesLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const { data } = await watchlistAPI.get();
      setWatchlist(data.quotes || []);
    } catch (err) {
      console.error('Watchlist fetch error:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleWatchlistSearch = (query) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await stockAPI.search(query.trim());
        setSearchResults(data.slice(0, 8));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const addToWatchlist = async (symbol) => {
    setAddingSymbol(symbol);
    try {
      await watchlistAPI.add(symbol);
      await fetchWatchlist();
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
    } catch (err) {
      console.error('Add to watchlist error:', err);
    } finally {
      setAddingSymbol(null);
    }
  };

  const removeFromWatchlist = async (e, symbol) => {
    e.stopPropagation();
    try {
      await watchlistAPI.remove(symbol);
      setWatchlist(prev => prev.filter(s => s.symbol !== symbol));
    } catch (err) {
      console.error('Remove from watchlist error:', err);
    }
  };

  const totalPortfolioValue = (user?.balance || 0) + (portfolioSummary?.currentValue || 0);
  const totalPnL = portfolioSummary?.totalPnL || 0;

  // Check if a symbol is already in watchlist
  const isInWatchlist = (symbol) => watchlist.some(s => s.symbol === symbol);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Loading your trading overview...</p>
        </div>
        <div className="dashboard-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card dashboard-stat-card">
              <div className="skeleton" style={{ height: 14, width: 100, marginBottom: 12 }}></div>
              <div className="skeleton" style={{ height: 28, width: 160 }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard animate-fadeIn">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name}! Here's your trading overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="card dashboard-stat-card stat-balance">
          <div className="stat-icon-wrap stat-icon-balance">
            <Wallet size={22} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Available Balance</p>
            <h3 className="stat-value">{formatCurrency(user?.balance || 0)}</h3>
          </div>
        </div>

        <div className="card dashboard-stat-card stat-portfolio">
          <div className="stat-icon-wrap stat-icon-portfolio">
            <PieChart size={22} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Portfolio Value</p>
            <h3 className="stat-value">{formatCurrency(portfolioSummary?.currentValue || 0)}</h3>
            {portfolioSummary?.holdingsCount > 0 && (
              <span className="stat-sub">{portfolioSummary.holdingsCount} stocks</span>
            )}
          </div>
        </div>

        <div className="card dashboard-stat-card stat-total">
          <div className="stat-icon-wrap stat-icon-total">
            <IndianRupee size={22} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Net Worth</p>
            <h3 className="stat-value">{formatCurrency(totalPortfolioValue)}</h3>
          </div>
        </div>

        <div className="card dashboard-stat-card stat-pnl">
          <div className={`stat-icon-wrap ${totalPnL >= 0 ? 'stat-icon-profit' : 'stat-icon-loss'}`}>
            {totalPnL >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div className="stat-content">
            <p className="stat-label">Total P&L</p>
            <h3 className={`stat-value ${getPnLClass(totalPnL)}`}>
              {formatChange(totalPnL)}
            </h3>
            {portfolioSummary?.totalPnLPercent !== undefined && portfolioSummary?.totalPnLPercent !== 0 && (
              <span className={`stat-sub ${getPnLClass(totalPnL)}`}>
                {formatPercent(portfolioSummary.totalPnLPercent)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Market Indices */}
      <div className="indices-section">
        <div className="indices-header">
          <BarChart3 size={20} />
          <h3>Market Indices</h3>
        </div>
        {indicesLoading ? (
          <div className="indices-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card index-card-skeleton">
                <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 10 }}></div>
                <div className="skeleton" style={{ height: 24, width: '70%', marginBottom: 6 }}></div>
                <div className="skeleton" style={{ height: 12, width: '40%' }}></div>
              </div>
            ))}
          </div>
        ) : indices.length === 0 ? (
          <div className="indices-empty">
            <p>Market indices data unavailable</p>
          </div>
        ) : (
          <div className="indices-grid">
            {indices.map((index) => {
              const isUp = index.change >= 0;
              const range = index.dayHigh - index.dayLow;
              const progress = range > 0 ? ((index.price - index.dayLow) / range) * 100 : 50;
              return (
                <div key={index.symbol} className="card index-card">
                  <div className="index-card-header">
                    <span className="index-name">{index.shortName}</span>
                    <span className={`index-change-badge ${isUp ? 'index-up' : 'index-down'}`}>
                      {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {isUp ? '+' : ''}{index.changePercent?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="index-price">
                    {formatNumber(index.price?.toFixed(2))}
                  </div>
                  <div className={`index-change-value ${isUp ? 'text-profit' : 'text-loss'}`}>
                    {isUp ? '+' : ''}{index.change?.toFixed(2)} pts
                  </div>
                  <div className="index-range">
                    <div className="index-range-labels">
                      <span>{formatNumber(index.dayLow?.toFixed(0))}</span>
                      <span>{formatNumber(index.dayHigh?.toFixed(0))}</span>
                    </div>
                    <div className="index-range-bar">
                      <div
                        className={`index-range-fill ${isUp ? 'fill-profit' : 'fill-loss'}`}
                        style={{ width: `${Math.min(Math.max(progress, 2), 98)}%` }}
                      ></div>
                    </div>
                    <div className="index-range-labels">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Watchlist Section */}
      <div className="watchlist-section">
        <div className="watchlist-header">
          <div className="watchlist-title">
            <Eye size={20} />
            <h3>My Watchlist</h3>
            <span className="watchlist-count">{watchlist.length}/20</span>
          </div>
          <div className="watchlist-actions" ref={searchRef}>
            <button
              className={`btn btn-sm ${showSearch ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) {
                  setSearchQuery('');
                  setSearchResults([]);
                }
              }}
            >
              {showSearch ? <X size={16} /> : <Plus size={16} />}
              {showSearch ? 'Cancel' : 'Add Stock'}
            </button>

            {showSearch && (
              <div className="watchlist-search-container">
                <div className="watchlist-search-input-wrap">
                  <Search size={16} className="watchlist-search-icon" />
                  <input
                    id="watchlist-search"
                    type="text"
                    placeholder="Search stocks to add..."
                    value={searchQuery}
                    onChange={(e) => handleWatchlistSearch(e.target.value)}
                    autoFocus
                  />
                  {searching && <div className="spinner spinner-sm watchlist-search-spinner"></div>}
                </div>

                {searchResults.length > 0 && (
                  <div className="watchlist-search-dropdown">
                    {searchResults.map((stock) => {
                      const alreadyAdded = isInWatchlist(stock.symbol);
                      return (
                        <button
                          key={stock.symbol}
                          className={`watchlist-search-item ${alreadyAdded ? 'already-added' : ''}`}
                          onClick={() => !alreadyAdded && addToWatchlist(stock.symbol)}
                          disabled={alreadyAdded || addingSymbol === stock.symbol}
                        >
                          <div className="watchlist-search-item-info">
                            <span className="watchlist-search-item-symbol">
                              {stock.symbol.replace(/\.(NS|BO)$/, '')}
                            </span>
                            <span className="watchlist-search-item-name">
                              {stock.shortName}
                            </span>
                          </div>
                          <div className="watchlist-search-item-right">
                            <span className={`badge ${stock.symbol.endsWith('.NS') ? 'badge-nse' : 'badge-bse'}`}>
                              {getExchange(stock.symbol)}
                            </span>
                            {alreadyAdded ? (
                              <span className="watchlist-added-label">Added</span>
                            ) : addingSymbol === stock.symbol ? (
                              <div className="spinner spinner-sm"></div>
                            ) : (
                              <Plus size={16} className="watchlist-add-icon" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchQuery.trim().length > 0 && searchResults.length === 0 && !searching && (
                  <div className="watchlist-search-dropdown">
                    <div className="watchlist-search-empty">No stocks found for "{searchQuery}"</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Watchlist Items */}
        {watchlistLoading ? (
          <div className="watchlist-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card watchlist-card-skeleton">
                <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }}></div>
                <div className="skeleton" style={{ height: 24, width: '40%' }}></div>
              </div>
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="watchlist-empty">
            <Star size={40} />
            <h4>Your watchlist is empty</h4>
            <p>Add stocks you want to track by clicking "Add Stock" above</p>
          </div>
        ) : (
          <div className="watchlist-grid">
            {watchlist.map((stock) => (
              <button
                key={stock.symbol}
                className="card watchlist-card"
                onClick={() => navigate(`/stocks/${encodeURIComponent(stock.symbol)}`)}
              >
                <button
                  className="watchlist-remove-btn"
                  onClick={(e) => removeFromWatchlist(e, stock.symbol)}
                  title="Remove from watchlist"
                >
                  <Trash2 size={14} />
                </button>
                <div className="watchlist-card-top">
                  <span className="watchlist-symbol">{cleanSymbol(stock.symbol)}</span>
                  <span className={`badge ${stock.symbol.endsWith('.NS') ? 'badge-nse' : 'badge-bse'}`}>
                    {getExchange(stock.symbol)}
                  </span>
                </div>
                <p className="watchlist-name">{stock.shortName}</p>
                <div className="watchlist-card-bottom">
                  <span className="watchlist-price">{formatCurrency(stock.price)}</span>
                  <span className={`watchlist-change ${stock.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {stock.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

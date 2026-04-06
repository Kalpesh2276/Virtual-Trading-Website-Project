import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI, watchlistAPI } from '../../services/api';
import { Eye, Search, Plus, X, Star, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, cleanSymbol, getExchange } from '../../utils/formatters';
import './Watchlist.css';

function Watchlist() {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchWatchlist();
    const interval = setInterval(fetchWatchlist, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const fetchWatchlist = async () => {
    try {
      const { data } = await watchlistAPI.get();
      setWatchlist(data.quotes || []);
    } catch (err) {
      console.error('Watchlist fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
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

  const isInWatchlist = (symbol) => watchlist.some(s => s.symbol === symbol);

  if (loading) {
    return (
      <div className="watchlist-page">
        <div className="page-header">
          <h1>My Watchlist</h1>
          <p>Loading your watchlist...</p>
        </div>
        <div className="watchlist-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card watchlist-card-skeleton">
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }}></div>
              <div className="skeleton" style={{ height: 24, width: '40%' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-page animate-fadeIn">
      <div className="page-header header-with-actions">
        <div>
          <h1>My Watchlist</h1>
          <p>Track your favorite stocks. ({watchlist.length}/20)</p>
        </div>
        
        <div className="watchlist-actions" ref={searchRef}>
          <button
            className={`btn ${showSearch ? 'btn-secondary' : 'btn-primary'}`}
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
                  onChange={(e) => handleSearch(e.target.value)}
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

      {watchlist.length === 0 ? (
        <div className="empty-state">
          <Star size={48} className="text-tertiary" />
          <h3>Your watchlist is empty</h3>
          <p>Add stocks you want to track by clicking the "Add Stock" button above to monitor their performance.</p>
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
                <Trash2 size={16} />
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
  );
}

export default Watchlist;

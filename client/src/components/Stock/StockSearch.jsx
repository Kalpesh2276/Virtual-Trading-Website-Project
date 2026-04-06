import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Filter } from 'lucide-react';
import { stockAPI } from '../../services/api';
import { formatCurrency, cleanSymbol, getExchange, getPnLClass } from '../../utils/formatters';
import './Stock.css';

function StockSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [popularStocks, setPopularStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const { data } = await stockAPI.getPopular();
        setPopularStocks(data);
      } catch (err) {
        console.error('Error fetching popular stocks:', err);
      } finally {
        setInitialLoad(false);
      }
    };
    fetchPopular();
  }, []);

  const handleSearch = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 1) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await stockAPI.search(value.trim());
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const displayStocks = query.trim().length > 0 ? results : popularStocks;
  const isSearching = query.trim().length > 0;

  return (
    <div className="stock-search-page animate-fadeIn">
      <div className="page-header">
        <h1>Explore Stocks</h1>
        <p>Search any stock listed on NSE or BSE</p>
      </div>

      <div className="search-bar-container">
        <Search size={20} className="search-bar-icon" />
        <input
          id="stock-search-input"
          type="text"
          className="search-bar-input"
          placeholder="Search by company name or symbol (e.g., Reliance, TCS, INFY)..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
        {loading && <div className="spinner spinner-sm search-bar-spinner"></div>}
      </div>

      {!isSearching && (
        <h3 className="search-section-title">
          <TrendingUp size={18} />
          Popular Stocks
        </h3>
      )}

      {isSearching && results.length === 0 && !loading && (
        <div className="empty-state">
          <Search size={48} />
          <h3>No stocks found</h3>
          <p>Try searching with a different company name or NSE/BSE symbol</p>
        </div>
      )}

      <div className="search-results-grid">
        {displayStocks.map((stock) => {
          const symbol = stock.symbol;
          const name = stock.shortName || stock.longName || symbol;
          const exchange = getExchange(symbol) || stock.exchange;
          const hasPrice = stock.price != null;

          return (
            <button
              key={symbol}
              className="card search-result-card"
              onClick={() => navigate(`/stocks/${encodeURIComponent(symbol)}`)}
            >
              <div className="search-result-top">
                <div>
                  <span className="search-result-symbol">{cleanSymbol(symbol)}</span>
                  <span className={`badge ${symbol.endsWith('.NS') ? 'badge-nse' : 'badge-bse'}`}>
                    {exchange}
                  </span>
                </div>
              </div>
              <p className="search-result-name">{name}</p>
              {hasPrice && (
                <div className="search-result-bottom">
                  <span className="search-result-price">{formatCurrency(stock.price)}</span>
                  <span className={`search-result-change ${getPnLClass(stock.changePercent)}`}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {initialLoad && (
        <div className="search-results-grid">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="card" style={{ padding: '1.25rem' }}>
              <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: 8 }}></div>
              <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 12 }}></div>
              <div className="skeleton" style={{ height: 20, width: '35%' }}></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StockSearch;

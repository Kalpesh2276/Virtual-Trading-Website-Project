import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stockAPI, watchlistAPI } from '../../services/api';
import {
  ArrowLeft, BarChart3, ArrowUpRight, ArrowDownRight,
  Bell, Bookmark, BookmarkCheck
} from 'lucide-react';
import { formatCurrency, formatPercent, formatVolume, cleanSymbol, getExchange } from '../../utils/formatters';
import StockChart from './StockChart';
import TradePanel from './TradePanel';
import './Stock.css';

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchQuoteOnly, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const decodedSymbol = decodeURIComponent(symbol);
      const [quoteRes, watchlistRes] = await Promise.allSettled([
        stockAPI.getQuote(decodedSymbol),
        watchlistAPI.get()
      ]);

      if (quoteRes.status === 'fulfilled') {
        setQuote(quoteRes.value.data);
        setError('');
      } else {
        throw new Error('Failed to fetch stock');
      }

      if (watchlistRes.status === 'fulfilled' && watchlistRes.value.data?.quotes) {
        setInWatchlist(watchlistRes.value.data.quotes.some(s => s.symbol === decodedSymbol));
      }
    } catch (err) {
      setError('Could not fetch stock data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuoteOnly = async () => {
    try {
      const { data } = await stockAPI.getQuote(decodeURIComponent(symbol));
      setQuote(data);
    } catch (e) {
      // ignore background sync errors
    }
  };

  const toggleWatchlist = async () => {
    const decodedSymbol = decodeURIComponent(symbol);
    try {
      if (inWatchlist) {
        await watchlistAPI.remove(decodedSymbol);
        setInWatchlist(false);
      } else {
        await watchlistAPI.add(decodedSymbol);
        setInWatchlist(true);
      }
    } catch (e) {
      console.error('Failed to toggle watchlist', e);
    }
  };

  if (loading) {
    return (
      <div className="stock-detail-layout animate-fadeIn">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="stock-detail-layout animate-fadeIn">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <BarChart3 size={48} />
          <h3>{error || 'Stock not found'}</h3>
          <p>Please try a different symbol or go back to search.</p>
        </div>
      </div>
    );
  }

  const isProfit = quote.change >= 0;

  return (
    <div className="stock-detail-layout animate-fadeIn">
      {/* LEFT COLUMN - Stock Info and Chart */}
      <div className="stock-detail-main">
        {/* Navigation */}
        <button className="btn btn-ghost stock-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Explore
        </button>

        {/* Header Block */}
        <div className="sd-header-row">
          <div className="sd-header-left">
            <div className="sd-symbol-row">
              <span className="sd-symbol">{cleanSymbol(quote.symbol)}</span>
              <span className="sd-exchange">· {getExchange(quote.symbol)}</span>
            </div>
            <h1 className="sd-title">{quote.longName || quote.shortName}</h1>
            <div className="sd-price-row">
              <span className="sd-price">{formatCurrency(quote.price)}</span>
              <span className={`sd-change ${isProfit ? 'text-profit' : 'text-loss'}`}>
                {isProfit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {formatCurrency(Math.abs(quote.change))} ({formatPercent(quote.changePercent)}) 1D
              </span>
            </div>
          </div>
          
          <div className="sd-header-actions">
            <button className="btn btn-ghost btn-icon" title="Set Alert">
              <Bell size={20} />
            </button>
            <button 
              className="btn btn-ghost btn-icon" 
              onClick={toggleWatchlist}
              title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              {inWatchlist ? <BookmarkCheck size={20} className="text-accent" /> : <Bookmark size={20} />}
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="stock-chart-container">
          <StockChart symbol={quote.symbol} />
        </div>

        {/* Stats Grid */}
        <div className="stock-stats-grid">
          <div className="stock-stat">
            <span className="stock-stat-label">Open</span>
            <span className="stock-stat-value">{formatCurrency(quote.open)}</span>
          </div>
          <div className="stock-stat">
            <span className="stock-stat-label">Prev Close</span>
            <span className="stock-stat-value">{formatCurrency(quote.previousClose)}</span>
          </div>
          <div className="stock-stat">
            <span className="stock-stat-label">Day High</span>
            <span className="stock-stat-value text-profit">{formatCurrency(quote.dayHigh)}</span>
          </div>
          <div className="stock-stat">
            <span className="stock-stat-label">Day Low</span>
            <span className="stock-stat-value text-loss">{formatCurrency(quote.dayLow)}</span>
          </div>
          <div className="stock-stat">
            <span className="stock-stat-label">Volume</span>
            <span className="stock-stat-value">{formatVolume(quote.volume)}</span>
          </div>
          <div className="stock-stat">
            <span className="stock-stat-label">Market Cap</span>
            <span className="stock-stat-value">{formatCurrency(quote.marketCap, true)}</span>
          </div>
          <div className="stock-stat">
            <span className="stock-stat-label">52W High</span>
            <span className="stock-stat-value">{formatCurrency(quote.fiftyTwoWeekHigh)}</span>
          </div>
          <div className="stock-stat">
            <span className="stock-stat-label">52W Low</span>
            <span className="stock-stat-value">{formatCurrency(quote.fiftyTwoWeekLow)}</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Trade Panel */}
      <div className="stock-detail-sidebar">
        <TradePanel quote={quote} onSuccess={fetchQuoteOnly} />
      </div>
    </div>
  );
}

export default StockDetail;

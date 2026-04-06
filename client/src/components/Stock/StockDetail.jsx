import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stockAPI } from '../../services/api';
import {
  ArrowLeft, TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  BarChart3, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { formatCurrency, formatPercent, formatVolume, cleanSymbol, getExchange, getPnLClass } from '../../utils/formatters';
import StockChart from './StockChart';
import TradeModal from './TradeModal';
import './Stock.css';

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tradeType, setTradeType] = useState(null); // 'BUY' | 'SELL' | null

  useEffect(() => {
    fetchQuote();
    const interval = setInterval(fetchQuote, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const fetchQuote = async () => {
    try {
      const { data } = await stockAPI.getQuote(decodeURIComponent(symbol));
      setQuote(data);
      setError('');
    } catch (err) {
      setError('Could not fetch stock data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stock-detail animate-fadeIn">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading stock data...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="stock-detail animate-fadeIn">
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
    <div className="stock-detail animate-fadeIn">
      <button className="btn btn-ghost stock-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      {/* Stock Header */}
      <div className="stock-header">
        <div className="stock-header-left">
          <div className="stock-header-title">
            <h1>{cleanSymbol(quote.symbol)}</h1>
            <span className={`badge ${quote.symbol.endsWith('.NS') ? 'badge-nse' : 'badge-bse'}`}>
              {getExchange(quote.symbol)}
            </span>
          </div>
          <p className="stock-header-name">{quote.longName || quote.shortName}</p>
        </div>
        <div className="stock-header-right">
          <h2 className="stock-header-price">{formatCurrency(quote.price)}</h2>
          <div className={`stock-header-change ${isProfit ? 'change-profit' : 'change-loss'}`}>
            {isProfit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            <span>{formatCurrency(Math.abs(quote.change))}</span>
            <span>({formatPercent(quote.changePercent)})</span>
          </div>
        </div>
      </div>

      {/* Trade Buttons */}
      <div className="stock-trade-buttons">
        <button className="btn btn-buy btn-lg" onClick={() => setTradeType('BUY')}>
          <ShoppingCart size={18} />
          Buy
        </button>
        <button className="btn btn-sell btn-lg" onClick={() => setTradeType('SELL')}>
          <DollarSign size={18} />
          Sell
        </button>
      </div>

      {/* Content Layout */}
      <div className="stock-content-grid">
        {/* Chart */}
        <div className="stock-chart-container card">
          <StockChart symbol={decodeURIComponent(symbol)} />
        </div>

        {/* Key Stats */}
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

      {/* Trade Modal */}
      {tradeType && (
        <TradeModal
          symbol={quote.symbol}
          companyName={quote.shortName || quote.longName}
          currentPrice={quote.price}
          type={tradeType}
          onClose={() => setTradeType(null)}
          onSuccess={() => {
            setTradeType(null);
            fetchQuote();
          }}
        />
      )}
    </div>
  );
}

export default StockDetail;

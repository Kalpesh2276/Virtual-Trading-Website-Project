import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI } from '../../services/api';
import { Briefcase, TrendingUp, TrendingDown, ArrowUpRight, BarChart3 } from 'lucide-react';
import { formatCurrency, formatPercent, cleanSymbol, getExchange, getPnLClass } from '../../utils/formatters';
import './Portfolio.css';

function Portfolio() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState({ holdings: [], summary: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolio = async () => {
    try {
      const { data } = await portfolioAPI.getPortfolio();
      setPortfolio(data);
    } catch (err) {
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const { holdings, summary } = portfolio;

  if (loading) {
    return (
      <div className="portfolio-page animate-fadeIn">
        <div className="page-header">
          <h1>Portfolio</h1>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="portfolio-page animate-fadeIn">
        <div className="page-header">
          <h1>Portfolio</h1>
          <p>Your stock holdings</p>
        </div>
        <div className="empty-state">
          <Briefcase size={56} />
          <h3>No Holdings Yet</h3>
          <p>Start trading by searching for stocks and making your first purchase!</p>
          <button className="btn btn-primary" onClick={() => navigate('/search')}>
            Explore Stocks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-page animate-fadeIn">
      <div className="page-header">
        <h1>Portfolio</h1>
        <p>Your stock holdings with real-time P&L</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="portfolio-summary-grid">
          <div className="card portfolio-summary-card">
            <p className="portfolio-summary-label">Total Invested</p>
            <h3 className="portfolio-summary-value">{formatCurrency(summary.totalInvested)}</h3>
          </div>
          <div className="card portfolio-summary-card">
            <p className="portfolio-summary-label">Current Value</p>
            <h3 className="portfolio-summary-value">{formatCurrency(summary.currentValue)}</h3>
          </div>
          <div className="card portfolio-summary-card">
            <p className="portfolio-summary-label">Total P&L</p>
            <h3 className={`portfolio-summary-value ${getPnLClass(summary.totalPnL)}`}>
              {summary.totalPnL >= 0 ? '+' : ''}{formatCurrency(summary.totalPnL)}
            </h3>
            <span className={`portfolio-summary-pct ${getPnLClass(summary.totalPnLPercent)}`}>
              {formatPercent(summary.totalPnLPercent)}
            </span>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="portfolio-table-container card">
        <div className="portfolio-table-scroll">
          <table className="data-table portfolio-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th>Qty</th>
                <th>Avg Price</th>
                <th>Current Price</th>
                <th>Invested</th>
                <th>Current Value</th>
                <th>P&L</th>
                <th>P&L %</th>
                <th>Day Change</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr
                  key={h.symbol}
                  className="portfolio-row"
                  onClick={() => navigate(`/stocks/${encodeURIComponent(h.symbol)}`)}
                >
                  <td>
                    <div className="portfolio-stock-info">
                      <span className="portfolio-symbol">{cleanSymbol(h.symbol)}</span>
                      <span className="portfolio-company">{h.companyName}</span>
                    </div>
                  </td>
                  <td className="portfolio-qty">{h.quantity}</td>
                  <td>{formatCurrency(h.avgBuyPrice)}</td>
                  <td className="portfolio-current-price">{formatCurrency(h.currentPrice)}</td>
                  <td>{formatCurrency(h.totalInvested)}</td>
                  <td className="portfolio-value">{formatCurrency(h.currentValue)}</td>
                  <td className={getPnLClass(h.pnl)}>
                    <strong>{h.pnl >= 0 ? '+' : ''}{formatCurrency(h.pnl)}</strong>
                  </td>
                  <td>
                    <span className={`badge ${h.pnlPercent >= 0 ? 'badge-buy' : 'badge-sell'}`}>
                      {formatPercent(h.pnlPercent)}
                    </span>
                  </td>
                  <td className={getPnLClass(h.dayChangePercent)}>
                    {h.dayChangePercent >= 0 ? '+' : ''}{h.dayChangePercent?.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Portfolio;

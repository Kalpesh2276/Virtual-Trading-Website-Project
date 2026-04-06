import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { stockAPI, portfolioAPI } from '../../services/api';
import { Briefcase } from 'lucide-react';
import { formatCurrency, formatChange, formatPercent, getPnLClass } from '../../utils/formatters';
import './Explore.css';

function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [popularStocks, setPopularStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, popularRes] = await Promise.all([
        portfolioAPI.getSummary(),
        stockAPI.getPopular()
      ]);
      setPortfolioSummary(summaryRes.data);
      setPopularStocks(popularRes.data);
    } catch (err) {
      console.error('Explore fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="explore-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Explore...</p>
        </div>
      </div>
    );
  }

  const totalPnL = portfolioSummary?.totalPnL || 0;
  const todayPnL = portfolioSummary?.todayPnL || 0;

  // Derive subsets from popular stocks
  const mostBought = popularStocks.slice(0, 4);
  const topGainers = [...popularStocks].filter(s => s.change > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 4);
  const topLosers = [...popularStocks].filter(s => s.change < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 4);

  const renderStockGrid = (stocks, emptyMessage) => {
    if (!stocks || stocks.length === 0) return <p className="text-secondary">{emptyMessage}</p>;
    return (
      <div className="popular-stocks-grid">
        {stocks.map((stock) => {
          const isUp = stock.change >= 0;
          return (
            <button
              key={stock.symbol}
              className="stock-card"
              onClick={() => navigate(`/stocks/${encodeURIComponent(stock.symbol)}`)}
            >
              <div className="stock-card-top">
                <span className="stock-symbol">{stock.symbol.replace(/\.(NS|BO)$/, '')}</span>
              </div>
              <div className="stock-card-bottom">
                <span className="stock-price">{formatCurrency(stock.price)}</span>
                <span className={`stock-change ${isUp ? 'text-profit' : 'text-loss'}`}>
                  {isUp ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderStockList = (stocks, emptyMessage) => {
    if (!stocks || stocks.length === 0) return <p className="text-secondary">{emptyMessage}</p>;
    return (
      <div className="vertical-stocks-list">
        {stocks.map((stock) => {
          const isUp = stock.change >= 0;
          return (
            <button
              key={stock.symbol}
              className="vertical-stock-item"
              onClick={() => navigate(`/stocks/${encodeURIComponent(stock.symbol)}`)}
            >
              <div className="vertical-stock-left">
                <span className="vertical-stock-symbol">{stock.symbol.replace(/\.(NS|BO)$/, '')}</span>
                <span className="vertical-stock-name">{stock.shortName}</span>
              </div>
              <div className="vertical-stock-right">
                <span className="stock-price">{formatCurrency(stock.price)}</span>
                <span className={`stock-change ${isUp ? 'text-profit' : 'text-loss'}`}>
                  {isUp ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="explore-page animate-fadeIn">
      <div className="explore-grid">
        {/* Left Column - Market Trends */}
        <div className="explore-main">
          <section className="explore-section">
            <div className="section-header">
              <h2>Most Bought on TradeSAFE</h2>
            </div>
            {renderStockGrid(mostBought, 'No data available for most bought.')}
          </section>

          <div className="explore-split-section">
            <section className="explore-section">
              <div className="section-header">
                <h2>Top Gainers</h2>
              </div>
              {renderStockList(topGainers, 'No gainers available currently.')}
            </section>

            <section className="explore-section">
              <div className="section-header">
                <h2>Top Losers</h2>
              </div>
              {renderStockList(topLosers, 'No losers available currently.')}
            </section>
          </div>
        </div>

        {/* Right Column - User Investments */}
        <div className="explore-sidebar">
          <section className="explore-section">
            <div className="section-header">
              <h2>Your Investments</h2>
            </div>
            
            <div className="portfolio-summary-card">
              <div className="portfolio-summary-header">
                <div className="portfolio-val-wrap">
                  <span className="portfolio-label">Current Value</span>
                  <h3 className="portfolio-value">{formatCurrency(portfolioSummary?.currentValue || 0)}</h3>
                </div>
                <div className="portfolio-val-wrap text-right">
                  <span className="portfolio-label">Invested Value</span>
                  <h3 className="portfolio-value">{formatCurrency(portfolioSummary?.totalInvestment || 0)}</h3>
                </div>
              </div>

              <div className="portfolio-summary-stats">
                <div className="portfolio-statRow">
                  <span>Total Returns</span>
                  <div className={`portfolio-returns ${getPnLClass(totalPnL)}`}>
                    {formatChange(totalPnL)} ({formatPercent(portfolioSummary?.totalPnLPercent || 0)})
                  </div>
                </div>
                <div className="portfolio-statRow">
                  <span>1D Returns</span>
                  <div className={`portfolio-returns ${getPnLClass(todayPnL)}`}>
                    {formatChange(todayPnL)} ({formatPercent(portfolioSummary?.todayPnLPercent || 0)})
                  </div>
                </div>
              </div>
              
              <button 
                className="btn btn-primary portfolio-link-btn"
                onClick={() => navigate('/portfolio')}
              >
                <Briefcase size={16} />
                View Full Portfolio
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Explore;

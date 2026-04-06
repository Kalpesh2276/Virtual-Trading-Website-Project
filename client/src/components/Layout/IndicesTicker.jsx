import { useState, useEffect } from 'react';
import { stockAPI } from '../../services/api';
import { formatNumber } from '../../utils/formatters';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './Layout.css';

function IndicesTicker() {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIndices();
    const interval = setInterval(fetchIndices, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchIndices = async () => {
    try {
      const { data } = await stockAPI.getIndices();
      setIndices(data);
    } catch (err) {
      console.error('Indices fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="indices-ticker-container">
        <div className="indices-ticker-skeleton">Loading Market Indices...</div>
      </div>
    );
  }

  if (indices.length === 0) return null;

  return (
    <div className="indices-ticker-container">
      <div className="indices-ticker">
        {indices.map((index) => {
          const isUp = index.change >= 0;
          return (
            <div key={index.symbol} className="ticker-item">
              <span className="ticker-name">{index.shortName}</span>
              <span className="ticker-price">{formatNumber(index.price?.toFixed(2))}</span>
              <span className={`ticker-change ${isUp ? 'text-profit' : 'text-loss'}`}>
                {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {isUp ? '+' : ''}{index.change?.toFixed(2)} ({index.changePercent?.toFixed(2)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default IndicesTicker;

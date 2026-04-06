import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transactionAPI } from '../../services/api';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency, getExchange, cleanSymbol } from '../../utils/formatters';

function TradePanel({ quote, onSuccess }) {
  const { user, updateBalance } = useAuth();
  const [tradeType, setTradeType] = useState('BUY'); // 'BUY' | 'SELL'
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isBuy = tradeType === 'BUY';
  const qty = Number(quantity) || 0;
  const totalCost = qty * quote.price;
  const maxAffordable = isBuy ? Math.floor((user?.balance || 0) / quote.price) : 0;

  // Clear states when mode switches
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [tradeType, quote.symbol]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (qty < 1) {
      setError('Enter a valid quantity');
      return;
    }

    if (isBuy && totalCost > (user?.balance || 0)) {
      setError(`Insufficient balance. (Req: ${formatCurrency(totalCost)})`);
      return;
    }

    setLoading(true);
    try {
      const apiFn = isBuy ? transactionAPI.buy : transactionAPI.sell;
      const { data } = await apiFn({ symbol: quote.symbol, quantity: qty });
      setSuccess(data.message);
      updateBalance(data.newBalance);
      setQuantity('');
      setTimeout(() => {
        setSuccess('');
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || `${tradeType} failed`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trade-panel-card">
      <div className="trade-panel-header">
        <h3>{quote.shortName || quote.longName}</h3>
        <p className="trade-panel-subtitle">
          {getExchange(quote.symbol)} {formatCurrency(quote.price)} 
          <span className={quote.change >= 0 ? 'text-profit' : 'text-loss'}>
            {' '}({quote.change >= 0 ? '+' : ''}{quote.changePercent?.toFixed(2)}%)
          </span>
        </p>
      </div>

      <div className="trade-panel-tabs">
        <button 
          className={`tp-tab ${isBuy ? 'tp-tab-buy active' : ''}`}
          onClick={() => setTradeType('BUY')}
        >
          BUY
        </button>
        <button 
          className={`tp-tab ${!isBuy ? 'tp-tab-sell active' : ''}`}
          onClick={() => setTradeType('SELL')}
        >
          SELL
        </button>
      </div>

      <div className="trade-panel-body">
        {error && (
          <div className="trade-alert trade-alert-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {success && (
          <div className="trade-alert trade-alert-success">
            <CheckCircle size={14} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="trade-panel-form">
          <div className="tp-order-types">
            <span className="badge badge-outline active">Delivery</span>
            <span className="badge badge-outline text-disabled">Intraday</span>
          </div>

          <div className="tp-input-group">
            <label>Qty <span className="text-disabled">{getExchange(quote.symbol)}</span></label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="tp-input-group">
            <label>Price <span className="text-disabled">Market</span></label>
            <input
              type="text"
              value={formatCurrency(quote.price)}
              disabled
              readOnly
            />
          </div>

          {isBuy && maxAffordable > 0 && (
            <div className="tp-helper-text">
               Max affordable: <button type="button" className="btn-link" onClick={() => setQuantity(String(maxAffordable))}>{maxAffordable} shares</button>
            </div>
          )}

          <div className="tp-footer">
            <div className="tp-footer-stats">
              <span>Balance: <br/><strong>{formatCurrency(user?.balance || 0)}</strong></span>
              <span className="text-right">Approx req:<br/><strong>{formatCurrency(totalCost)}</strong></span>
            </div>
            <button
              type="submit"
              className={`btn tp-submit-btn ${isBuy ? 'btn-buy' : 'btn-sell'}`}
              disabled={loading || qty < 1 || success}
            >
              {loading ? (
                 <div className="spinner spinner-sm"></div>
              ) : (
                tradeType
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TradePanel;

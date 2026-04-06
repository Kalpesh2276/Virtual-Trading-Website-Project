import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transactionAPI } from '../../services/api';
import { X, ShoppingCart, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

function TradeModal({ symbol, companyName, currentPrice, type, onClose, onSuccess }) {
  const { user, updateBalance } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isBuy = type === 'BUY';
  const qty = Number(quantity) || 0;
  const totalCost = qty * currentPrice;
  const maxAffordable = isBuy ? Math.floor((user?.balance || 0) / currentPrice) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (qty < 1) {
      setError('Enter a valid quantity (minimum 1)');
      return;
    }

    if (isBuy && totalCost > (user?.balance || 0)) {
      setError(`Insufficient balance. Need ${formatCurrency(totalCost)}`);
      return;
    }

    setLoading(true);
    try {
      const apiFn = isBuy ? transactionAPI.buy : transactionAPI.sell;
      const { data } = await apiFn({ symbol, quantity: qty });
      setSuccess(data.message);
      updateBalance(data.newBalance);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || `${type} failed`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="trade-modal-header">
          <div className="trade-modal-title">
            <div className={`trade-modal-icon ${isBuy ? 'trade-icon-buy' : 'trade-icon-sell'}`}>
              {isBuy ? <ShoppingCart size={20} /> : <DollarSign size={20} />}
            </div>
            <div>
              <h2>{isBuy ? 'Buy' : 'Sell'} Stock</h2>
              <p>{companyName}</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="trade-alert trade-alert-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="trade-alert trade-alert-success">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="trade-price-display">
            <span className="trade-label">Current Price</span>
            <span className="trade-price">{formatCurrency(currentPrice)}</span>
          </div>

          <div className="trade-field">
            <label htmlFor="trade-quantity">Quantity</label>
            <input
              id="trade-quantity"
              type="number"
              min="1"
              step="1"
              placeholder="Enter number of shares"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
            {isBuy && maxAffordable > 0 && (
              <div className="trade-max">
                Max affordable: <button type="button" className="trade-max-btn" onClick={() => setQuantity(String(maxAffordable))}>{maxAffordable} shares</button>
              </div>
            )}
          </div>

          <div className="trade-summary">
            <div className="trade-summary-row">
              <span>Price × Quantity</span>
              <span>{formatCurrency(currentPrice)} × {qty || 0}</span>
            </div>
            <div className="trade-summary-row trade-summary-total">
              <span>Estimated {isBuy ? 'Cost' : 'Proceeds'}</span>
              <span className={isBuy ? 'text-loss' : 'text-profit'}>{formatCurrency(totalCost)}</span>
            </div>
            {isBuy && (
              <div className="trade-summary-row">
                <span>Balance After</span>
                <span>{formatCurrency((user?.balance || 0) - totalCost)}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`btn ${isBuy ? 'btn-buy' : 'btn-sell'} btn-lg trade-submit`}
            disabled={loading || qty < 1 || success}
          >
            {loading ? (
              <div className="spinner spinner-sm"></div>
            ) : (
              `${isBuy ? 'Buy' : 'Sell'} ${qty > 0 ? qty : ''} Share${qty !== 1 ? 's' : ''}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TradeModal;

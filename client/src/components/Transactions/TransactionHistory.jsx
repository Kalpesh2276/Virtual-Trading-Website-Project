import { useState, useEffect } from 'react';
import { transactionAPI } from '../../services/api';
import { History, ArrowUpCircle, ArrowDownCircle, Receipt } from 'lucide-react';
import { formatCurrency, formatDateTime, cleanSymbol, getExchange } from '../../utils/formatters';
import './Transactions.css';

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, BUY, SELL

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter !== 'ALL') params.type = filter;
      const { data } = await transactionAPI.getHistory(params);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Transactions fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transactions-page animate-fadeIn">
      <div className="page-header">
        <h1>Transaction History</h1>
        <p>Your complete trading log</p>
      </div>

      {/* Filters */}
      <div className="transactions-filters">
        {['ALL', 'BUY', 'SELL'].map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : f === 'BUY' ? '🟢 Buy' : '🔴 Sell'}
          </button>
        ))}
        <span className="transactions-count">{pagination.total} transactions</span>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <Receipt size={56} />
          <h3>No Transactions Yet</h3>
          <p>Your buy and sell transactions will appear here.</p>
        </div>
      ) : (
        <>
          <div className="transactions-table-container card">
            <div className="transactions-table-scroll">
              <table className="data-table transactions-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Stock</th>
                    <th>Exchange</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t._id} className="transaction-row">
                      <td className="transaction-date">{formatDateTime(t.createdAt)}</td>
                      <td>
                        <span className={`badge ${t.type === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                          {t.type === 'BUY' ? (
                            <><ArrowDownCircle size={12} /> BUY</>
                          ) : (
                            <><ArrowUpCircle size={12} /> SELL</>
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="transaction-stock-info">
                          <span className="transaction-symbol">{cleanSymbol(t.symbol)}</span>
                          <span className="transaction-company">{t.companyName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${t.symbol.endsWith('.NS') ? 'badge-nse' : 'badge-bse'}`}>
                          {getExchange(t.symbol)}
                        </span>
                      </td>
                      <td className="transaction-qty">{t.quantity}</td>
                      <td>{formatCurrency(t.price)}</td>
                      <td className={`transaction-amount ${t.type === 'BUY' ? 'text-loss' : 'text-profit'}`}>
                        <strong>{t.type === 'BUY' ? '-' : '+'}{formatCurrency(t.totalAmount)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="transactions-pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchTransactions(pagination.page - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchTransactions(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TransactionHistory;

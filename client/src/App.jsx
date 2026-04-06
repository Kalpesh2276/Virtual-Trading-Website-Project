import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Navbar from './components/Layout/Navbar';
import IndicesTicker from './components/Layout/IndicesTicker';
import Explore from './components/Explore/Explore';
import Watchlist from './components/Watchlist/Watchlist';
import StockSearch from './components/Stock/StockSearch';
import StockDetail from './components/Stock/StockDetail';
import Portfolio from './components/Portfolio/Portfolio';
import TransactionHistory from './components/Transactions/TransactionHistory';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner"></div>
        <p>Loading TradeSAFE...</p>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  return user ? <Navigate to="/" replace /> : children;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <div className="app-main">
        <Navbar />
        <IndicesTicker />
        <main className="app-content">
          {children}
        </main>
        <footer className="app-footer">
          &copy; 2026 Kalpesh Warke. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><Explore /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <AppLayout><StockSearch /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/stocks/:symbol" element={
        <ProtectedRoute>
          <AppLayout><StockDetail /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/portfolio" element={
        <ProtectedRoute>
          <AppLayout><Portfolio /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/watchlist" element={
        <ProtectedRoute>
          <AppLayout><Watchlist /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute>
          <AppLayout><TransactionHistory /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

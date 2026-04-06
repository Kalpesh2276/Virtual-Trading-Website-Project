import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Stock API
export const stockAPI = {
  search: (query) => api.get(`/stocks/search?q=${encodeURIComponent(query)}`),
  getQuote: (symbol) => api.get(`/stocks/quote/${encodeURIComponent(symbol)}`),
  getHistory: (symbol, range = '1mo') =>
    api.get(`/stocks/history/${encodeURIComponent(symbol)}?range=${range}`),
  getPopular: () => api.get('/stocks/popular'),
  getIndices: () => api.get('/stocks/indices'),
};

// Portfolio API
export const portfolioAPI = {
  getPortfolio: () => api.get('/portfolio'),
  getSummary: () => api.get('/portfolio/summary'),
};

// Transaction API
export const transactionAPI = {
  buy: (data) => api.post('/transactions/buy', data),
  sell: (data) => api.post('/transactions/sell', data),
  getHistory: (params = {}) => api.get('/transactions', { params }),
};

// Watchlist API
export const watchlistAPI = {
  get: () => api.get('/watchlist'),
  add: (symbol) => api.post('/watchlist/add', { symbol }),
  remove: (symbol) => api.delete(`/watchlist/${encodeURIComponent(symbol)}`),
};

export default api;

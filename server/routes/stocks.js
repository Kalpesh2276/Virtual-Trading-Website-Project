import express from 'express';
import auth from '../middleware/auth.js';
import { searchStocks, getQuote, getChartData, getPopularStocks, getIndices } from '../services/stockService.js';

const router = express.Router();

// GET /api/stocks/search?q=term
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }
    const results = await searchStocks(q.trim());
    res.json(results);
  } catch (error) {
    console.error('Stock search error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stocks/popular
router.get('/popular', auth, async (req, res) => {
  try {
    const stocks = await getPopularStocks();
    res.json(stocks);
  } catch (error) {
    console.error('Popular stocks error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stocks/quote/:symbol
router.get('/quote/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await getQuote(symbol);
    res.json(quote);
  } catch (error) {
    console.error('Quote error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stocks/history/:symbol?range=1mo
router.get('/history/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1mo' } = req.query;
    const data = await getChartData(symbol, range);
    res.json(data);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stocks/indices — market index quotes
router.get('/indices', auth, async (req, res) => {
  try {
    const indices = await getIndices();
    res.json(indices);
  } catch (error) {
    console.error('Indices error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

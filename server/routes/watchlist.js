import express from 'express';
import auth from '../middleware/auth.js';
import Watchlist from '../models/Watchlist.js';
import { getMultipleQuotes } from '../services/stockService.js';

const router = express.Router();

// GET /api/watchlist — get user's watchlist with live prices
router.get('/', auth, async (req, res) => {
  try {
    let watchlist = await Watchlist.findOne({ user: req.user._id });
    if (!watchlist) {
      return res.json({ symbols: [], quotes: [] });
    }

    const symbolList = watchlist.symbols.map(s => s.symbol);
    let quotes = [];
    if (symbolList.length > 0) {
      quotes = await getMultipleQuotes(symbolList);
    }

    res.json({
      symbols: watchlist.symbols,
      quotes,
    });
  } catch (error) {
    console.error('Watchlist fetch error:', error);
    res.status(500).json({ message: 'Could not fetch watchlist' });
  }
});

// POST /api/watchlist/add — add a symbol to watchlist
router.post('/add', auth, async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    const upperSymbol = symbol.toUpperCase().trim();

    let watchlist = await Watchlist.findOne({ user: req.user._id });
    if (!watchlist) {
      watchlist = new Watchlist({ user: req.user._id, symbols: [] });
    }

    // Check if already in watchlist
    const exists = watchlist.symbols.some(s => s.symbol === upperSymbol);
    if (exists) {
      return res.status(400).json({ message: 'Stock already in watchlist' });
    }

    // Limit to 20 stocks
    if (watchlist.symbols.length >= 20) {
      return res.status(400).json({ message: 'Watchlist is full (max 20 stocks)' });
    }

    watchlist.symbols.push({ symbol: upperSymbol });
    await watchlist.save();

    res.json({ message: 'Stock added to watchlist', symbol: upperSymbol });
  } catch (error) {
    console.error('Watchlist add error:', error);
    res.status(500).json({ message: 'Could not add to watchlist' });
  }
});

// DELETE /api/watchlist/:symbol — remove a symbol from watchlist
router.delete('/:symbol', auth, async (req, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol).toUpperCase().trim();

    const watchlist = await Watchlist.findOne({ user: req.user._id });
    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }

    const idx = watchlist.symbols.findIndex(s => s.symbol === symbol);
    if (idx === -1) {
      return res.status(404).json({ message: 'Stock not in watchlist' });
    }

    watchlist.symbols.splice(idx, 1);
    await watchlist.save();

    res.json({ message: 'Stock removed from watchlist', symbol });
  } catch (error) {
    console.error('Watchlist remove error:', error);
    res.status(500).json({ message: 'Could not remove from watchlist' });
  }
});

export default router;

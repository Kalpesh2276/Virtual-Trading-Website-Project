import express from 'express';
import auth from '../middleware/auth.js';
import Portfolio from '../models/Portfolio.js';
import { getMultipleQuotes } from '../services/stockService.js';

const router = express.Router();

// Get user's portfolio with live prices
router.get('/', auth, async (req, res) => {
  try {
    const holdings = await Portfolio.find({
      userId: req.user._id,
      quantity: { $gt: 0 },
    }).lean();

    if (holdings.length === 0) {
      return res.json({ holdings: [], summary: { totalInvested: 0, currentValue: 0, totalPnL: 0, totalPnLPercent: 0 } });
    }

    // Fetch live prices for all holdings
    const symbols = holdings.map(h => h.symbol);
    const quotes = await getMultipleQuotes(symbols);
    const priceMap = {};
    quotes.forEach(q => { priceMap[q.symbol] = q; });

    // Enrich holdings with live data
    let totalInvested = 0;
    let currentValue = 0;

    const enrichedHoldings = holdings.map(h => {
      const liveQuote = priceMap[h.symbol];
      const currentPrice = liveQuote ? liveQuote.price : h.avgBuyPrice;
      const value = currentPrice * h.quantity;
      const pnl = value - h.totalInvested;
      const pnlPercent = h.totalInvested > 0 ? (pnl / h.totalInvested) * 100 : 0;

      totalInvested += h.totalInvested;
      currentValue += value;

      return {
        ...h,
        currentPrice,
        currentValue: value,
        pnl,
        pnlPercent,
        dayChange: liveQuote ? liveQuote.change : 0,
        dayChangePercent: liveQuote ? liveQuote.changePercent : 0,
      };
    });

    const totalPnL = currentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    res.json({
      holdings: enrichedHoldings,
      summary: {
        totalInvested,
        currentValue,
        totalPnL,
        totalPnLPercent,
      },
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/portfolio/summary - Quick summary
router.get('/summary', auth, async (req, res) => {
  try {
    const holdings = await Portfolio.find({
      userId: req.user._id,
      quantity: { $gt: 0 },
    }).lean();

    if (holdings.length === 0) {
      return res.json({
        totalInvested: 0,
        currentValue: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        holdingsCount: 0,
      });
    }

    const symbols = holdings.map(h => h.symbol);
    const quotes = await getMultipleQuotes(symbols);
    const priceMap = {};
    quotes.forEach(q => { priceMap[q.symbol] = q; });

    let totalInvested = 0;
    let currentValue = 0;

    holdings.forEach(h => {
      const liveQuote = priceMap[h.symbol];
      const currentPrice = liveQuote ? liveQuote.price : h.avgBuyPrice;
      totalInvested += h.totalInvested;
      currentValue += currentPrice * h.quantity;
    });

    const totalPnL = currentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    res.json({
      totalInvested,
      currentValue,
      totalPnL,
      totalPnLPercent,
      holdingsCount: holdings.length,
    });
  } catch (error) {
    console.error('Portfolio summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

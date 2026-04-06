import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Portfolio from '../models/Portfolio.js';
import { getQuote } from '../services/stockService.js';

const router = express.Router();

// POST /api/transactions/buy
router.post('/buy', auth, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Symbol and valid quantity are required' });
    }

    const qty = Math.floor(Number(quantity));
    if (qty < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Get current price
    const quote = await getQuote(symbol);
    if (!quote || !quote.price) {
      return res.status(400).json({ message: 'Could not fetch current price for this stock' });
    }

    const totalCost = quote.price * qty;

    // Check balance
    const user = await User.findById(req.user._id);
    if (user.balance < totalCost) {
      return res.status(400).json({
        message: `Insufficient balance. Need ₹${totalCost.toFixed(2)} but only have ₹${user.balance.toFixed(2)}`,
      });
    }

    // Deduct balance
    user.balance -= totalCost;
    await user.save();

    // Update or create portfolio entry
    let portfolio = await Portfolio.findOne({ userId: user._id, symbol });

    if (portfolio) {
      // Update weighted average price
      const newTotalInvested = portfolio.totalInvested + totalCost;
      const newQuantity = portfolio.quantity + qty;
      portfolio.avgBuyPrice = newTotalInvested / newQuantity;
      portfolio.totalInvested = newTotalInvested;
      portfolio.quantity = newQuantity;
      await portfolio.save();
    } else {
      portfolio = new Portfolio({
        userId: user._id,
        symbol,
        companyName: quote.shortName || quote.longName || symbol,
        quantity: qty,
        avgBuyPrice: quote.price,
        totalInvested: totalCost,
      });
      await portfolio.save();
    }

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      symbol,
      companyName: quote.shortName || quote.longName || symbol,
      type: 'BUY',
      quantity: qty,
      price: quote.price,
      totalAmount: totalCost,
    });
    await transaction.save();

    res.json({
      message: `Successfully bought ${qty} shares of ${quote.shortName || symbol} at ₹${quote.price.toFixed(2)}`,
      transaction: {
        id: transaction._id,
        symbol,
        type: 'BUY',
        quantity: qty,
        price: quote.price,
        totalAmount: totalCost,
      },
      newBalance: user.balance,
    });
  } catch (error) {
    console.error('Buy error:', error);
    res.status(500).json({ message: 'Server error during buy' });
  }
});

// POST /api/transactions/sell
router.post('/sell', auth, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Symbol and valid quantity are required' });
    }

    const qty = Math.floor(Number(quantity));
    if (qty < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Check holdings
    const portfolio = await Portfolio.findOne({ userId: req.user._id, symbol });
    if (!portfolio || portfolio.quantity < qty) {
      const held = portfolio ? portfolio.quantity : 0;
      return res.status(400).json({
        message: `Insufficient holdings. You have ${held} shares of ${symbol}`,
      });
    }

    // Get current price
    const quote = await getQuote(symbol);
    if (!quote || !quote.price) {
      return res.status(400).json({ message: 'Could not fetch current price for this stock' });
    }

    const totalProceeds = quote.price * qty;

    // Add balance
    const user = await User.findById(req.user._id);
    user.balance += totalProceeds;
    await user.save();

    // Update portfolio
    const soldInvestment = portfolio.avgBuyPrice * qty;
    portfolio.quantity -= qty;
    portfolio.totalInvested -= soldInvestment;

    if (portfolio.quantity === 0) {
      portfolio.totalInvested = 0;
      portfolio.avgBuyPrice = 0;
    }
    await portfolio.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      symbol,
      companyName: quote.shortName || quote.longName || symbol,
      type: 'SELL',
      quantity: qty,
      price: quote.price,
      totalAmount: totalProceeds,
    });
    await transaction.save();

    const pnl = totalProceeds - soldInvestment;

    res.json({
      message: `Successfully sold ${qty} shares of ${quote.shortName || symbol} at ₹${quote.price.toFixed(2)}`,
      transaction: {
        id: transaction._id,
        symbol,
        type: 'SELL',
        quantity: qty,
        price: quote.price,
        totalAmount: totalProceeds,
        pnl,
      },
      newBalance: user.balance,
    });
  } catch (error) {
    console.error('Sell error:', error);
    res.status(500).json({ message: 'Server error during sell' });
  }
});

// GET /api/transactions - Get transaction history
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, symbol } = req.query;

    const filter = { userId: req.user._id };
    if (type) filter.type = type.toUpperCase();
    if (symbol) filter.symbol = symbol.toUpperCase();

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

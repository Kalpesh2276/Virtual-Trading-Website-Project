import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  avgBuyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalInvested: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  timestamps: true,
});

// Compound index: one portfolio entry per user per stock
portfolioSchema.index({ userId: 1, symbol: 1 }, { unique: true });

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;

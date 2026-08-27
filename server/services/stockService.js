import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 60000; // 60 seconds

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Popular NSE & BSE stocks for the dashboard
const POPULAR_STOCKS = [
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'LT.NS', 'HCLTECH.NS', 'AXISBANK.NS', 'WIPRO.NS', 'MARUTI.NS',
  'TATAMOTORS.NS', 'TATASTEEL.NS', 'BAJFINANCE.NS', 'SUNPHARMA.NS',
  'ADANIENT.NS', 'ONGC.NS', 'NTPC.NS', 'POWERGRID.NS', 'JSWSTEEL.NS',
  'ULTRACEMCO.NS', 'TITAN.NS', 'NESTLEIND.NS', 'BAJAJFINSV.NS',
  'TECHM.NS', 'HDFCLIFE.NS',
];

/**
 * Get a real-time quote for a stock symbol
 */
export async function getQuote(symbol) {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    let quote;
    try {
      quote = await yahooFinance.quote(symbol);
    } catch (err) {
      if (err.name === 'FailedYahooValidationError' && err.result) quote = err.result;
      else throw err;
    }
    if (!quote) {
      throw new Error(`Yahoo Finance returned empty quote for ${symbol}`);
    }
    
    const data = {
      symbol: quote.symbol,
      shortName: quote.shortName || quote.longName || symbol,
      longName: quote.longName || quote.shortName || symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      exchange: quote.exchange,
      currency: quote.currency || 'INR',
    };
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    throw new Error(`Could not fetch quote for ${symbol}`);
  }
}

/**
 * Search for stocks across NSE and BSE
 */
export async function searchStocks(query) {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    let result;
    try {
      result = await yahooFinance.search(query, { newsCount: 0, quotesCount: 20 });
    } catch (err) {
      if (err.name === 'FailedYahooValidationError' && err.result) result = err.result;
      else throw err;
    }
    
    // Filter for Indian stocks (NSE: .NS, BSE: .BO) and equity types
    let quotes = (result.quotes || [])
      .filter(q => {
        const sym = q.symbol || '';
        const isIndian = sym.endsWith('.NS') || sym.endsWith('.BO');
        const isEquity = q.quoteType === 'EQUITY' || (q.typeDisp || '').toLowerCase() === 'equity';
        return isIndian && isEquity;
      })
      .map(q => ({
        symbol: q.symbol,
        shortName: q.shortname || q.longname || q.symbol,
        longName: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || (q.symbol.endsWith('.NS') ? 'NSE' : 'BSE'),
        type: q.typeDisp || 'Equity',
      }));

    // If no Indian results, try appending .NS and .BO
    if (quotes.length === 0) {
      const nseSym = query.toUpperCase() + '.NS';
      const bseSym = query.toUpperCase() + '.BO';
      try {
        const catchYfError = (e) => (e.name === 'FailedYahooValidationError' && e.result) ? e.result : Promise.reject(e);
        const [nseQuote, bseQuote] = await Promise.allSettled([
          yahooFinance.quote(nseSym).catch(catchYfError),
          yahooFinance.quote(bseSym).catch(catchYfError),
        ]);
        if (nseQuote.status === 'fulfilled' && nseQuote.value) {
          quotes.push({
            symbol: nseQuote.value.symbol,
            shortName: nseQuote.value.shortName || nseSym,
            longName: nseQuote.value.longName || nseSym,
            exchange: 'NSE',
            type: 'Equity',
          });
        }
        if (bseQuote.status === 'fulfilled' && bseQuote.value) {
          quotes.push({
            symbol: bseQuote.value.symbol,
            shortName: bseQuote.value.shortName || bseSym,
            longName: bseQuote.value.longName || bseSym,
            exchange: 'BSE',
            type: 'Equity',
          });
        }
      } catch (e) {
        // ignore fallback errors
      }
    }

    setCache(cacheKey, quotes);
    return quotes;
  } catch (error) {
    console.error(`Error searching stocks for "${query}":`, error.message);
    throw new Error(`Could not search stocks for "${query}"`);
  }
}

/**
 * Get historical chart data
 */
export async function getChartData(symbol, range = '1mo') {
  const cacheKey = `chart:${symbol}:${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Calculate period1 based on range
    const now = new Date();
    let period1;
    let interval = '1d';

    switch (range) {
      case '1d':
        period1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        interval = '5m';
        break;
      case '1w':
        period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = '15m';
        break;
      case '1mo':
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = '1d';
        break;
      case '3mo':
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        interval = '1d';
        break;
      case '6mo':
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        interval = '1wk';
        break;
      case '1y':
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        interval = '1wk';
        break;
      case '5y':
        period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        interval = '1mo';
        break;
      default:
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = '1d';
    }

    let result;
    try {
      result = await yahooFinance.chart(symbol, {
        period1,
        period2: now,
        interval,
      });
    } catch (err) {
      if (err.name === 'FailedYahooValidationError' && err.result) result = err.result;
      else throw err;
    }

    const data = (result.quotes || []).map(q => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    })).filter(q => q.close != null);

    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching chart for ${symbol}:`, error.message);
    throw new Error(`Could not fetch chart data for ${symbol}`);
  }
}

/**
 * Get quotes for popular stocks (batch)
 */
export async function getPopularStocks() {
  const cacheKey = 'popular';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const promises = POPULAR_STOCKS.map(async (symbol) => {
      try {
        return await getQuote(symbol);
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    const data = results.filter(Boolean);
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching popular stocks:', error.message);
    throw new Error('Could not fetch popular stocks');
  }
}

/**
 * Get multiple quotes at once
 */
export async function getMultipleQuotes(symbols) {
  const promises = symbols.map(async (symbol) => {
    try {
      return await getQuote(symbol);
    } catch {
      return null;
    }
  });
  return (await Promise.all(promises)).filter(Boolean);
}

/**
 * Indian market indices
 */
const INDIAN_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50', shortName: 'Nifty 50' },
  { symbol: '^BSESN', name: 'SENSEX', shortName: 'Sensex' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY', shortName: 'Bank Nifty' },
  { symbol: '^CNXIT', name: 'NIFTY IT', shortName: 'Nifty IT' },
  { symbol: '^CNXPHARMA', name: 'NIFTY PHARMA', shortName: 'Nifty Pharma' },
  { symbol: 'NIFTYMIDCAP150.NS', name: 'NIFTY MIDCAP 150', shortName: 'Nifty Midcap 150' },
];

/**
 * Get market index quotes
 */
export async function getIndices() {
  const cacheKey = 'indices';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const promises = INDIAN_INDICES.map(async (index) => {
      try {
        let quote;
        try {
          quote = await yahooFinance.quote(index.symbol);
        } catch (err) {
          if (err.name === 'FailedYahooValidationError' && err.result) quote = err.result;
          else throw err;
        }
        return {
          symbol: index.symbol,
          name: index.name,
          shortName: index.shortName,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          previousClose: quote.regularMarketPreviousClose,
          dayHigh: quote.regularMarketDayHigh,
          dayLow: quote.regularMarketDayLow,
        };
      } catch {
        return null;
      }
    });

    const results = (await Promise.all(promises)).filter(Boolean);
    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error fetching indices:', error.message);
    throw new Error('Could not fetch market indices');
  }
}

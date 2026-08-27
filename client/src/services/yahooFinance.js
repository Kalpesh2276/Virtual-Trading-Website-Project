/**
 * Client-side Yahoo Finance service.
 * Fetches stock data directly from the user's browser via a CORS proxy,
 * so requests come from the visitor's home IP (not Render's datacenter IP).
 */

const CORS_PROXIES = [
  { prefix: 'https://corsproxy.io/?',              encode: false },
  { prefix: 'https://api.allorigins.win/raw?url=',  encode: true },
  { prefix: 'https://api.codetabs.com/v1/proxy?quest=', encode: true },
];

const YAHOO_BASE = 'https://query2.finance.yahoo.com';

// ── In-memory cache ────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 60_000; // 60 seconds

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ── Fetch helper (tries multiple CORS proxies) ────────────────────────
async function fetchYahoo(path) {
  const url = `${YAHOO_BASE}${path}`;

  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy.prefix + (proxy.encode ? encodeURIComponent(url) : url);
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;
      const json = await res.json();
      // Basic sanity check — Yahoo always returns an object
      if (json && typeof json === 'object') return json;
    } catch {
      continue;
    }
  }
  throw new Error(`All CORS proxies failed for ${path}`);
}

// ── Constants ──────────────────────────────────────────────────────────
export const POPULAR_SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'LT.NS', 'HCLTECH.NS', 'AXISBANK.NS', 'WIPRO.NS', 'MARUTI.NS',
  'TATAMOTORS.NS', 'TATASTEEL.NS', 'BAJFINANCE.NS', 'SUNPHARMA.NS',
  'ADANIENT.NS', 'ONGC.NS', 'NTPC.NS', 'POWERGRID.NS', 'JSWSTEEL.NS',
  'ULTRACEMCO.NS', 'TITAN.NS', 'NESTLEIND.NS', 'BAJAJFINSV.NS',
  'TECHM.NS', 'HDFCLIFE.NS',
];

const INDIAN_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50', shortName: 'Nifty 50' },
  { symbol: '^BSESN', name: 'SENSEX', shortName: 'Sensex' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY', shortName: 'Bank Nifty' },
  { symbol: '^CNXIT', name: 'NIFTY IT', shortName: 'Nifty IT' },
  { symbol: '^CNXPHARMA', name: 'NIFTY PHARMA', shortName: 'Nifty Pharma' },
  { symbol: 'NIFTYMIDCAP150.NS', name: 'NIFTY MIDCAP 150', shortName: 'Nifty Midcap 150' },
];

// ── Normalize a Yahoo quote object to our app format ───────────────────
function normalizeQuote(q) {
  return {
    symbol: q.symbol,
    shortName: q.shortName || q.longName || q.symbol,
    longName: q.longName || q.shortName || q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    previousClose: q.regularMarketPreviousClose,
    open: q.regularMarketOpen,
    dayHigh: q.regularMarketDayHigh,
    dayLow: q.regularMarketDayLow,
    volume: q.regularMarketVolume,
    marketCap: q.marketCap,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    exchange: q.fullExchangeName || q.exchange,
    currency: q.currency || 'INR',
  };
}

// ── Search ──────────────────────────────────────────────────────────────
export async function search(query) {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchYahoo(
    `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`
  );

  let quotes = (data.quotes || [])
    .filter((q) => {
      const sym = q.symbol || '';
      return (sym.endsWith('.NS') || sym.endsWith('.BO')) && q.quoteType === 'EQUITY';
    })
    .map((q) => ({
      symbol: q.symbol,
      shortName: q.shortname || q.longname || q.symbol,
      longName: q.longname || q.shortname || q.symbol,
      exchange: q.exchDisp || (q.symbol.endsWith('.NS') ? 'NSE' : 'BSE'),
      type: q.typeDisp || 'Equity',
    }));

  // Fallback: try appending .NS / .BO if no results
  if (quotes.length === 0) {
    const nseSym = query.toUpperCase() + '.NS';
    const bseSym = query.toUpperCase() + '.BO';
    try {
      const fallback = await fetchYahoo(
        `/v7/finance/quote?symbols=${encodeURIComponent(nseSym + ',' + bseSym)}`
      );
      (fallback.quoteResponse?.result || []).forEach((q) => {
        quotes.push({
          symbol: q.symbol,
          shortName: q.shortName || q.symbol,
          longName: q.longName || q.symbol,
          exchange: q.symbol.endsWith('.NS') ? 'NSE' : 'BSE',
          type: 'Equity',
        });
      });
    } catch {
      // ignore fallback errors
    }
  }

  setCache(cacheKey, quotes);
  return quotes;
}

// ── Single quote ────────────────────────────────────────────────────────
export async function getQuote(symbol) {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchYahoo(
    `/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`
  );
  const q = data.quoteResponse?.result?.[0];
  if (!q) throw new Error(`No quote found for ${symbol}`);

  const result = normalizeQuote(q);
  setCache(cacheKey, result);
  return result;
}

// ── Popular stocks (batch) ──────────────────────────────────────────────
export async function getPopular() {
  const cacheKey = 'popular';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const symbols = POPULAR_SYMBOLS.join(',');
  const data = await fetchYahoo(
    `/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`
  );

  const result = (data.quoteResponse?.result || []).map(normalizeQuote);
  setCache(cacheKey, result);
  return result;
}

// ── Market indices ──────────────────────────────────────────────────────
export async function getIndices() {
  const cacheKey = 'indices';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const symbols = INDIAN_INDICES.map((i) => i.symbol).join(',');
  const data = await fetchYahoo(
    `/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`
  );

  const quotes = data.quoteResponse?.result || [];
  const result = quotes.map((q) => {
    const meta = INDIAN_INDICES.find((i) => i.symbol === q.symbol);
    return {
      symbol: q.symbol,
      name: meta?.name || q.shortName,
      shortName: meta?.shortName || q.shortName,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      previousClose: q.regularMarketPreviousClose,
      dayHigh: q.regularMarketDayHigh,
      dayLow: q.regularMarketDayLow,
    };
  });

  setCache(cacheKey, result);
  return result;
}

// ── Historical chart data ───────────────────────────────────────────────
export async function getHistory(symbol, range = '1mo') {
  const cacheKey = `chart:${symbol}:${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let interval;
  switch (range) {
    case '1d':  interval = '5m';  break;
    case '1w':  interval = '15m'; break;
    case '1mo': interval = '1d';  break;
    case '3mo': interval = '1d';  break;
    case '6mo': interval = '1wk'; break;
    case '1y':  interval = '1wk'; break;
    case '5y':  interval = '1mo'; break;
    default:    interval = '1d';
  }

  const data = await fetchYahoo(
    `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`
  );

  const chartResult = data.chart?.result?.[0];
  if (!chartResult) throw new Error(`No chart data for ${symbol}`);

  const timestamps = chartResult.timestamp || [];
  const ohlcv = chartResult.indicators?.quote?.[0] || {};

  const result = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString(),
      open: ohlcv.open?.[i],
      high: ohlcv.high?.[i],
      low: ohlcv.low?.[i],
      close: ohlcv.close?.[i],
      volume: ohlcv.volume?.[i],
    }))
    .filter((q) => q.close != null);

  setCache(cacheKey, result);
  return result;
}

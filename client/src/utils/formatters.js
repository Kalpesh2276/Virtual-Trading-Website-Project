/**
 * Format number as Indian currency (₹)
 */
export function formatCurrency(value, compact = false) {
  if (value == null || isNaN(value)) return '₹0.00';

  if (compact) {
    const abs = Math.abs(value);
    if (abs >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    }
    if (abs >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    if (abs >= 1000) {
      return `₹${(value / 1000).toFixed(2)}K`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '0.00%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format change with sign
 */
export function formatChange(value) {
  if (value == null || isNaN(value)) return '₹0.00';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}

/**
 * Format number with Indian locale
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Format volume (compact)
 */
export function formatVolume(value) {
  if (value == null || isNaN(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${(value / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

/**
 * Format date/time
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get exchange from symbol
 */
export function getExchange(symbol) {
  if (!symbol) return '';
  if (symbol.endsWith('.NS')) return 'NSE';
  if (symbol.endsWith('.BO')) return 'BSE';
  return '';
}

/**
 * Get clean symbol name (without exchange suffix)
 */
export function cleanSymbol(symbol) {
  if (!symbol) return '';
  return symbol.replace(/\.(NS|BO)$/, '');
}

/**
 * Determine if value is profit or loss
 */
export function getPnLClass(value) {
  if (value > 0) return 'text-profit';
  if (value < 0) return 'text-loss';
  return 'text-secondary';
}

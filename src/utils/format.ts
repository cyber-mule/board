const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  const normalized = currency || 'USD';
  const cached = currencyFormatterCache.get(normalized);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalized,
    maximumFractionDigits: 2,
  });
  currencyFormatterCache.set(normalized, formatter);
  return formatter;
}

export function formatCurrency(cents?: number | null, currency = 'USD'): string {
  if (cents === null || cents === undefined) {
    return '-';
  }

  const amount = cents / 100;
  return getCurrencyFormatter(currency).format(amount);
}

export function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined) {
    return '-';
  }

  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / Math.pow(base, exponent);

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDateTime(seconds?: number | null): string {
  if (!seconds) {
    return '-';
  }

  const date = new Date(seconds * 1000);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDate(seconds?: number | null): string {
  if (!seconds) {
    return '-';
  }

  const date = new Date(seconds * 1000);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

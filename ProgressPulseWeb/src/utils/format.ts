export const formatMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export const formatRating = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export function moneyText(value: number): string {
  return formatMoney.format(value);
}

export function signedMoney(value: number): string {
  if (value === 0) return '$0';
  return `${value > 0 ? '+' : ''}${formatMoney.format(value)}`;
}

export function ratingText(value: number | undefined): string {
  if (value === undefined) return '—';
  return formatRating.format(value);
}

export function monthLong(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

export function monthShort(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
}

export function formatDelta(value: number | undefined, asMoney = false): string {
  if (value === undefined) return '—';
  if (value === 0) return asMoney ? '— $0' : '— 0.0';
  if (asMoney) {
    return `${value >= 0 ? '↑ +' : '↓ -'}${moneyText(Math.abs(value))}`;
  }

  const abs = Math.abs(value).toFixed(1);
  return `${value >= 0 ? '↑ +' : '↓ -'}${abs}`;
}

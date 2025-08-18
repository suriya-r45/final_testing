export type Currency = 'INR' | 'BHD';

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  BHD: 'BD',
} as const;

export const CURRENCY_NAMES = {
  INR: 'Indian Rupees',
  BHD: 'Bahrain Dinar',
} as const;

export function formatPrice(amount: string | number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (currency === 'BHD') {
    return `${symbol} ${numAmount.toFixed(3)}`;
  }
  
  return `${symbol} ${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function parsePrice(priceStr: string): number {
  return parseFloat(priceStr.replace(/[^\d.-]/g, ''));
}

export function formatCurrency(amount: number, currency: Currency): string {
  return formatPrice(amount, currency);
}

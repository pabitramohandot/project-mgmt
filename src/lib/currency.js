export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'AED', symbol: 'AED', label: 'AED (AED) - UAE Dirham' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$) - Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$) - Australian Dollar' },
];

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  CAD: 'C$',
  AUD: 'A$',
};

export function getCurrencySymbol(currencyCode = 'INR') {
  const code = (currencyCode || 'INR').toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatCurrency(amount = 0, currencyCode = 'INR') {
  const symbol = getCurrencySymbol(currencyCode);
  const num = Number(amount) || 0;
  const isLetterCode = symbol.length > 2;
  return isLetterCode ? `${symbol} ${num.toLocaleString()}` : `${symbol}${num.toLocaleString()}`;
}

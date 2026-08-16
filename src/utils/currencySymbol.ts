import { Currency, DEFAULT_CURRENCY, GLOBAL_CURRENCIES } from '../data/constants';

export function resolveCurrency(stored: string): Currency {
  return (
    GLOBAL_CURRENCIES.find(c => c.code === stored) ??
    GLOBAL_CURRENCIES.find(c => c.symbol === stored) ??
    DEFAULT_CURRENCY
  );
}
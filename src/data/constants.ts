export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const GLOBAL_CURRENCIES: Currency[] = [
  // Major Global Currencies
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound Sterling' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },

  // African Currencies
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'XAF', symbol: 'FCFA', name: 'CFA Franc BEAC' },
  { code: 'XOF', symbol: 'CFA', name: 'CFA Franc BCEAO' },
  { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi' },
  { code: 'UGX', symbol: 'USSh', name: 'Ugandan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza' },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },

  // Americas
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso' },
  { code: 'COP', symbol: 'CO$', name: 'Colombian Peso' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'PEN', symbol: 'S/.', name: 'Peruvian Sol' },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
  { code: 'VES', symbol: 'Bs.', name: 'Venezuelan Bolívar' },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },

  // Asia & Middle East
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Đồng' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal' },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel' },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar' },

  // Europe (Non-Eurozone)
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
];

export const DEFAULT_CURRENCY: Currency =
  GLOBAL_CURRENCIES.find(c => c.code === 'USD') ?? GLOBAL_CURRENCIES[0];
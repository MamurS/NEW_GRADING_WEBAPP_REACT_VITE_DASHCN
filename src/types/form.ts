export interface FormData {
  companyCode: string;
  country: string;
  isGroup: boolean;
  requestedLimitCurrency: string;
  requestedLimitAmount: string;
  creditLimitDecisionCurrency: string;
  language: string;
}

export const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'China',
  'Japan',
  'Russia',
  'Kazakhstan',
  'Uzbekistan',
  'Mongolia',
  'United Arab Emirates',
  'Saudi Arabia',
  'India',
  'South Korea',
  'Singapore'
];

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'RUB',
  'KZT',
  'UZS',
  'MNT',
  'AED',
  'SAR',
  'INR',
  'KRW',
  'SGD'
];

export const LANGUAGES = [
  'English',
  'Russian',
  'Mongolian',
  'Uzbek',
  'Kazakh',
  'German',
  'French',
  'Chinese (Mandarin)',
  'Arabic',
  'Japanese'
]; 
// App-wide constants
export const APP_NAME = 'Stock Analyzer';

export const TIME_RANGES = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'] as const;
export type TimeRange = typeof TIME_RANGES[number];

export const POPULAR_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
  'META', 'TSLA', 'JPM', 'GS', 'MS',
];

export const SENTIMENT_COLORS = {
  positive: 'text-green-600',
  neutral: 'text-gray-400',
  negative: 'text-red-600',
} as const;

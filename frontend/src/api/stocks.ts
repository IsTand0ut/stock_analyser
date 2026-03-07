import { apiClient } from './client';

export const fetchQuote = async (ticker: string) => {
  const { data } = await apiClient.get(`/stocks/${ticker}/quote`);
  return data;
};

export const fetchHistory = async (ticker: string, range = '1M') => {
  const { data } = await apiClient.get(`/stocks/${ticker}/history`, { params: { range } });
  return data;
};

export const fetchFundamentals = async (ticker: string) => {
  const { data } = await apiClient.get(`/stocks/${ticker}/fundamentals`);
  return data;
};

export const compareTickers = async (tickers: string[]) => {
  const { data } = await apiClient.get('/stocks/compare', { params: { tickers: tickers.join(',') } });
  return data;
};

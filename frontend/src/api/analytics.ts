import { apiClient } from './client';

export const fetchTechnicals = async (ticker: string, range = '6M') => {
  const { data } = await apiClient.get(`/analytics/${ticker}/technicals`, { params: { range } });
  return data;
};

export const runDCF = async (
  ticker: string,
  params: { wacc: number; terminal_growth_rate: number; projection_years: number; revenue_growth_rate?: number }
) => {
  const { data } = await apiClient.post(`/analytics/${ticker}/dcf`, params);
  return data;
};

export const fetchSentiment = async (ticker: string) => {
  const { data } = await apiClient.get(`/analytics/${ticker}/sentiment`);
  return data;
};

export const runBacktest = async (
  ticker: string,
  params: { fast_period: number; slow_period: number; range: string }
) => {
  const { data } = await apiClient.post(`/analytics/${ticker}/backtest`, params);
  return data;
};

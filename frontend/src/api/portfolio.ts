import { apiClient } from './client';

export const fetchPortfolios = async () => {
  const { data } = await apiClient.get('/portfolio/');
  return data;
};

export const createPortfolio = async (payload: { name: string; description?: string }) => {
  const { data } = await apiClient.post('/portfolio/', payload);
  return data;
};

export const fetchPortfolio = async (id: number) => {
  const { data } = await apiClient.get(`/portfolio/${id}`);
  return data;
};

export const deletePortfolio = async (id: number) => {
  const { data } = await apiClient.delete(`/portfolio/${id}`);
  return data;
};

export const addHolding = async (
  portfolioId: number,
  payload: { ticker: string; shares: number; avg_cost: number }
) => {
  const { data } = await apiClient.post(`/portfolio/${portfolioId}/holdings`, payload);
  return data;
};

import { apiClient } from './client';

export const fetchAccount    = async () => (await apiClient.get('/trading/account')).data;
export const fetchPositions  = async () => (await apiClient.get('/trading/positions')).data;
export const fetchOrders     = async (status = 'all', limit = 50) =>
  (await apiClient.get('/trading/orders', { params: { status, limit } })).data;

export const placeMarketOrder = async (symbol: string, qty: number, side: 'buy' | 'sell') =>
  (await apiClient.post('/trading/orders/market', { symbol, qty, side })).data;

export const placeLimitOrder = async (
  symbol: string, qty: number, side: 'buy' | 'sell', limit_price: number
) => (await apiClient.post('/trading/orders/limit', { symbol, qty, side, limit_price })).data;

export const cancelOrder    = async (id: string) =>
  (await apiClient.delete(`/trading/orders/${id}`)).data;

export const cancelAllOrders = async () =>
  (await apiClient.delete('/trading/orders')).data;

export const closePosition  = async (symbol: string) =>
  (await apiClient.delete(`/trading/positions/${symbol}`)).data;

export const closeAllPositions = async () =>
  (await apiClient.delete('/trading/positions')).data;

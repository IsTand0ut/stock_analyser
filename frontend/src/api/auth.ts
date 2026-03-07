import { apiClient } from './client';

export const login = async (email: string, password: string) => {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data; // { access_token, refresh_token, token_type }
};

export const register = async (email: string, username: string, password: string) => {
  const { data } = await apiClient.post('/auth/register', { email, username, password });
  return data;
};

export const refreshToken = async (refreshTok: string) => {
  const { data } = await apiClient.post('/auth/refresh', { refresh_token: refreshTok });
  return data;
};

import { useQuery } from '@tanstack/react-query';
import { fetchTechnicals } from '@/api/analytics';

export function useIndicators(ticker: string, range = '6M') {
  return useQuery({
    queryKey: ['technicals', ticker, range],
    queryFn: () => fetchTechnicals(ticker, range),
    enabled: Boolean(ticker),
  });
}

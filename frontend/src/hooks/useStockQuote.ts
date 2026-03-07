import { useQuery } from '@tanstack/react-query';
import { fetchQuote } from '@/api/stocks';

export function useStockQuote(ticker: string) {
  return useQuery({
    queryKey: ['quote', ticker],
    queryFn: () => fetchQuote(ticker),
    refetchInterval: 30_000,  // fallback poll; WebSocket handles real-time updates
    enabled: Boolean(ticker),
  });
}

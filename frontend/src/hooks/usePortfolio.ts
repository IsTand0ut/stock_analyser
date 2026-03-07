import { useQuery } from '@tanstack/react-query';
import { fetchPortfolios } from '@/api/portfolio';

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: fetchPortfolios,
  });
}

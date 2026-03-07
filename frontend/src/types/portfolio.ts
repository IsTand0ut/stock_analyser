// Portfolio types
export interface Holding {
  id: number;
  ticker: string;
  shares: number;
  avg_cost: number;
  purchased_at: string;
}

export interface Portfolio {
  id: number;
  name: string;
  description: string;
  created_at: string;
  holdings: Holding[];
}

export interface PortfolioPnL {
  portfolio_id: number;
  total_cost: number;
  current_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  holdings: HoldingPnL[];
}

export interface HoldingPnL {
  ticker: string;
  shares: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  pnl: number;
  pnl_pct: number;
}

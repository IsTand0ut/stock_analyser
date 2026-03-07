// Analytics types
export interface IndicatorPoint {
  timestamp: string;
  value: number | null;
}

export interface DCFInput {
  wacc: number;
  terminal_growth_rate: number;
  projection_years: number;
  revenue_growth_rate?: number;
}

export interface DCFResult {
  ticker: string;
  intrinsic_value: number;
  current_price: number;
  margin_of_safety: number;
  upside_pct: number;
  assumptions: DCFInput;
}

export interface BacktestResult {
  total_return: number;
  annualized_return: number;
  max_drawdown: number;
  sharpe_ratio: number;
  num_trades: number;
  win_rate: number;
  signals: Record<string, unknown>[];
}

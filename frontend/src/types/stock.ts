// Stock types
export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  market_cap: number | null;
  pe_ratio: number | null;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
  timestamp: string;
}

export interface OHLCVBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalData {
  ticker: string;
  range: string;
  interval: string;
  data: OHLCVBar[];
}

export interface Fundamentals {
  ticker: string;
  sector: string | null;
  industry: string | null;
  pe_ratio: number | null;
  forward_pe: number | null;
  eps: number | null;
  revenue: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  roe: number | null;
  debt_to_equity: number | null;
  free_cash_flow: number | null;
  dividend_yield: number | null;
  beta: number | null;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  published_at: string;
  sentiment_score: number;
  sentiment_label: 'positive' | 'neutral' | 'negative';
}

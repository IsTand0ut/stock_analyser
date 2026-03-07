import { create } from 'zustand';

export interface PriceUpdate {
  ticker: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  timestamp: string;
}

interface LiveDataStore {
  prices: Record<string, PriceUpdate>;
  subscribedTickers: Set<string>;
  updatePrice: (update: PriceUpdate) => void;
  addSubscription: (ticker: string) => void;
  removeSubscription: (ticker: string) => void;
}

export const useLiveDataStore = create<LiveDataStore>((set) => ({
  prices: {},
  subscribedTickers: new Set(),
  updatePrice: (update) =>
    set((state) => ({ prices: { ...state.prices, [update.ticker]: update } })),
  addSubscription: (ticker) =>
    set((state) => ({ subscribedTickers: new Set([...state.subscribedTickers, ticker]) })),
  removeSubscription: (ticker) =>
    set((state) => {
      const next = new Set(state.subscribedTickers);
      next.delete(ticker);
      return { subscribedTickers: next };
    }),
}));

import { create } from 'zustand';

interface WatchlistStore {
  tickers: string[];
  add: (ticker: string) => void;
  remove: (ticker: string) => void;
}

export const useWatchlistStore = create<WatchlistStore>((set) => ({
  tickers: [],
  add: (ticker) => set((state) => ({ tickers: [...new Set([...state.tickers, ticker.toUpperCase()])] })),
  remove: (ticker) => set((state) => ({ tickers: state.tickers.filter((t) => t !== ticker.toUpperCase()) })),
}));

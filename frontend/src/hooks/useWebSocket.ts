import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLiveDataStore } from '@/store/liveDataStore';

const WS_BASE = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:8000/ws';
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useWebSocket(ticker: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { token } = useAuthStore();
  const { updatePrice, addSubscription, removeSubscription } = useLiveDataStore();

  useEffect(() => {
    if (!ticker || !token) return;
    addSubscription(ticker);

    const connect = (attempt = 0) => {
      wsRef.current = new WebSocket(`${WS_BASE}/stocks/${ticker}?token=${token}`);

      wsRef.current.onopen = () =>
        console.info(`[WS] Connected → ${ticker}`);

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === 'price_update') updatePrice(data);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      wsRef.current.onerror = (err) => console.error('[WS] Error:', err);

      wsRef.current.onclose = (event) => {
        if (!event.wasClean) {
          const delay = BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)];
          reconnectTimeout.current = setTimeout(() => connect(attempt + 1), delay);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close(1000, 'Component unmounted');
      removeSubscription(ticker);
    };
  }, [ticker, token]);
}

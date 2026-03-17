import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { placeMarketOrder, placeLimitOrder } from '@/api/trading';
import { formatCurrency } from '@/utils/formatters';
import toast from 'react-hot-toast';

interface TradeModalProps {
  ticker: string;
  currentPrice?: number;
  onClose: () => void;
}

/** Ticker validation regex */
const TICKER_RE = /^[A-Z]{1,5}(-[A-Z])?$/;

export function TradeModal({ ticker, currentPrice, onClose }: TradeModalProps) {
  const qc = useQueryClient();
  const [side, setSide]      = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [qty, setQty]        = useState('');
  const [limitPx, setLimitPx] = useState(currentPrice ? String(currentPrice.toFixed(2)) : '');

  const isBuy = side === 'buy';
  const accentColor = isBuy ? 'var(--accent-green)' : 'var(--accent-red)';

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const q = parseFloat(qty);
      if (!TICKER_RE.test(ticker))      throw new Error(`Invalid ticker: ${ticker}`);
      if (!q || q <= 0)                  throw new Error('Quantity must be > 0');
      if (orderType === 'limit') {
        const lp = parseFloat(limitPx);
        if (!lp || lp <= 0)             throw new Error('Limit price must be > 0');
        return placeLimitOrder(ticker, q, side, lp);
      }
      return placeMarketOrder(ticker, q, side);
    },
    onSuccess: (data) => {
      const type = orderType === 'limit' ? `@ $${limitPx}` : '@ Market';
      toast.success(`Order placed — ${ticker} ×${qty} ${side.toUpperCase()} ${type}`);
      qc.invalidateQueries({ queryKey: ['trading-positions'] });
      qc.invalidateQueries({ queryKey: ['trading-orders'] });
      qc.invalidateQueries({ queryKey: ['trading-account'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? err?.message ?? 'Order failed');
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
            <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Trade <span style={{ color: accentColor }}>{ticker}</span>
            </h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current price reference */}
        {currentPrice && (
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg mb-4 text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Current Price</span>
            <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(currentPrice)}
            </span>
          </div>
        )}

        {/* Buy / Sell toggle */}
        <div
          className="flex rounded-xl overflow-hidden mb-4"
          style={{ border: '1px solid var(--border)' }}
        >
          {(['buy', 'sell'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: side === s
                  ? s === 'buy' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'
                  : 'transparent',
                color: side === s
                  ? s === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)'
                  : 'var(--text-muted)',
              }}
            >
              {s === 'buy' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Market / Limit toggle */}
        <div className="flex gap-2 mb-4">
          {(['market', 'limit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className="tab-pill capitalize"
              style={orderType === t
                ? { background: 'var(--gradient-hero)', color: '#fff' }
                : {}}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Quantity (shares)</label>
            <input
              value={qty}
              onChange={e => setQty(e.target.value)}
              type="number"
              min="0.001"
              step="0.001"
              placeholder="e.g. 5"
              className="w-full px-3 py-2.5 text-sm"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
            />
          </div>

          {orderType === 'limit' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Limit Price ($)</label>
              <input
                value={limitPx}
                onChange={e => setLimitPx(e.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 150.00"
                className="w-full px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
              />
            </div>
          )}
        </div>

        {/* Cost estimate */}
        {currentPrice && qty && !isNaN(parseFloat(qty)) && (
          <div className="text-xs mb-4 flex justify-between px-1" style={{ color: 'var(--text-muted)' }}>
            <span>Estimated cost</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
              ≈ {formatCurrency(currentPrice * parseFloat(qty))}
            </span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => mutate()}
          disabled={isPending || !qty}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            background: isBuy
              ? 'linear-gradient(135deg,#10b981,#059669)'
              : 'linear-gradient(135deg,#ef4444,#dc2626)',
            color: '#fff',
            opacity: isPending || !qty ? 0.5 : 1,
            cursor: isPending || !qty ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Place {side.toUpperCase()} Order
            </>
          )}
        </button>

        <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
          Paper trading only — no real money involved
        </p>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAccount, fetchPositions, fetchOrders,
  cancelOrder, closePosition,
} from '@/api/trading';
import { AppLayout } from '@/components/AppLayout';
import { TradeModal } from '@/components/trading/TradeModal';
import { formatCurrency, formatPct } from '@/utils/formatters';
import {
  TrendingUp, TrendingDown, Wallet, Activity,
  DollarSign, Plus, X, AlertTriangle, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Sub-components ─────────────────────────────────────────────────────────

function AccountCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    filled:            { bg: 'rgba(16,185,129,0.12)',  text: 'var(--accent-green)' },
    partially_filled:  { bg: 'rgba(245,158,11,0.12)',  text: 'var(--accent-yellow)' },
    new:               { bg: 'rgba(79,110,247,0.12)',  text: 'var(--accent-blue)' },
    accepted:          { bg: 'rgba(79,110,247,0.12)',  text: 'var(--accent-blue)' },
    pending_new:       { bg: 'rgba(79,110,247,0.12)',  text: 'var(--accent-blue)' },
    canceled:          { bg: 'rgba(91,91,122,0.2)',    text: 'var(--text-muted)' },
    expired:           { bg: 'rgba(91,91,122,0.2)',    text: 'var(--text-muted)' },
  };
  const c = colors[status] ?? { bg: 'rgba(91,91,122,0.2)', text: 'var(--text-secondary)' };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ background: c.bg, color: c.text }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function Trading() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'positions' | 'orders'>('positions');
  const [showModal, setShowModal] = useState(false);
  const [orderSymbol, setOrderSymbol] = useState('');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderQty, setOrderQty] = useState('');
  const [limitPx, setLimitPx] = useState('');

  const { data: account, isError: acctError, isLoading: acctLoading } = useQuery({
    queryKey: ['trading-account'],
    queryFn: fetchAccount,
    refetchInterval: 30_000,
  });

  const { data: positions = [], isLoading: posLoading } = useQuery({
    queryKey: ['trading-positions'],
    queryFn: fetchPositions,
    refetchInterval: 30_000,
  });

  const { data: orders = [], isLoading: ordLoading } = useQuery({
    queryKey: ['trading-orders'],
    queryFn: fetchOrders,
  });

  const { mutate: doCancel } = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading-orders'] });
      toast.success('Order cancelled');
    },
    onError: () => toast.error('Failed to cancel order'),
  });

  const { mutate: doClose } = useMutation({
    mutationFn: closePosition,
    onSuccess: (_, sym) => {
      qc.invalidateQueries({ queryKey: ['trading-positions'] });
      qc.invalidateQueries({ queryKey: ['trading-account'] });
      toast.success(`Closed position: ${sym}`);
    },
    onError: () => toast.error('Failed to close position'),
  });

  const dayPnl = account?.day_pnl ?? 0;
  const isPnlPos = dayPnl >= 0;

  // Keys indicating an order is still open/cancellable
  const OPEN_STATUSES = ['new', 'accepted', 'pending_new', 'held', 'partially_filled'];

  if (acctError) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto mt-20 card p-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 opacity-50" style={{ color: 'var(--accent-yellow)' }} />
          <h2 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            Alpaca not connected
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Add your Alpaca paper trading keys to the backend <code>.env</code> file:
          </p>
          <pre
            className="text-left text-xs p-4 rounded-xl"
            style={{ background: 'var(--bg-secondary)', color: 'var(--accent-green)' }}
          >
{`ALPACA_API_KEY=your_key_here
ALPACA_SECRET_KEY=your_secret_here`}
          </pre>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Get free keys at <a href="https://alpaca.markets" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent-blue)' }}>alpaca.markets</a>
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {showModal && (
        <TradeModal
          ticker={orderSymbol || 'AAPL'}
          currentPrice={undefined}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
            Paper Trading
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Powered by Alpaca — practice with fake money, real market data
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
        >
          <Zap className="w-4 h-4" /> Quick Trade
        </button>
      </div>

      {/* Account summary cards */}
      {acctLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-24 skeleton" />
          ))}
        </div>
      ) : account && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <AccountCard
            icon={Wallet}
            label="Buying Power"
            value={formatCurrency(account.buying_power)}
            color="var(--accent-blue)"
          />
          <AccountCard
            icon={DollarSign}
            label="Portfolio Value"
            value={formatCurrency(account.portfolio_value)}
            color="var(--accent-purple)"
          />
          <AccountCard
            icon={isPnlPos ? TrendingUp : TrendingDown}
            label="Day P&L"
            value={`${isPnlPos ? '+' : ''}${formatCurrency(dayPnl)} (${formatPct(account.day_pnl_pct)})`}
            color={isPnlPos ? 'var(--accent-green)' : 'var(--accent-red)'}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1 rounded-xl w-fit"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(['positions', 'orders'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-pill capitalize ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'positions' ? 'Open Positions' : 'Order History'}
            {tab === 'positions' && positions.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(79,110,247,0.2)', color: 'var(--accent-blue)' }}>
                {positions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Open Positions ─────────────────────────────────────────────── */}
      {activeTab === 'positions' && (
        posLoading ? (
          <div className="card h-40 skeleton" />
        ) : positions.length === 0 ? (
          <div className="card text-center p-12" style={{ borderStyle: 'dashed' }}>
            <Activity className="w-8 h-8 mx-auto mb-3 opacity-25" style={{ color: 'var(--accent-blue)' }} />
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>No open positions</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Place a trade to get started
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    {['Symbol', 'Qty', 'Avg Entry', 'Current', 'Mkt Value', 'P&L', 'P&L %', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p: any, idx: number) => {
                    const pos = (p.unrealized_pl ?? 0) >= 0;
                    return (
                      <tr key={p.symbol}
                        style={{
                          background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border)',
                        }}>
                        <td className="px-4 py-3 font-display font-bold text-sm"
                          style={{ color: 'var(--accent-blue)' }}>{p.symbol}</td>
                        <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{p.qty}</td>
                        <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(p.avg_entry_price)}</td>
                        <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                          {p.current_price ? formatCurrency(p.current_price) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {p.market_value ? formatCurrency(p.market_value) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-semibold"
                          style={{ color: pos ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {p.unrealized_pl != null ? (pos ? '+' : '') + formatCurrency(p.unrealized_pl) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {p.unrealized_plpc != null && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pos ? 'badge-positive' : 'badge-negative'}`}>
                              {pos ? '+' : ''}{formatPct(p.unrealized_plpc)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              if (window.confirm(`Close entire ${p.symbol} position?`)) doClose(p.symbol);
                            }}
                            className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}
                          >
                            <X className="w-3 h-3" /> Close
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Order History ──────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        ordLoading ? (
          <div className="card h-40 skeleton" />
        ) : orders.length === 0 ? (
          <div className="card text-center p-12" style={{ borderStyle: 'dashed' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No orders yet</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    {['Symbol', 'Side', 'Qty', 'Type', 'Status', 'Price', 'Time', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any, idx: number) => {
                    const isBuy = o.side === 'buy';
                    const canCancel = OPEN_STATUSES.includes(o.status);
                    return (
                      <tr key={o.id}
                        style={{
                          background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border)',
                        }}>
                        <td className="px-4 py-3 font-display font-bold text-sm"
                          style={{ color: 'var(--accent-blue)' }}>{o.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold flex items-center gap-1 ${isBuy ? '' : ''}`}
                            style={{ color: isBuy ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {o.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{o.qty ?? '—'}</td>
                        <td className="px-4 py-3 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{o.order_type}</td>
                        <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                          {o.filled_avg_price ? formatCurrency(o.filled_avg_price)
                            : o.limit_price ? formatCurrency(o.limit_price)
                            : 'Market'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {canCancel && (
                            <button
                              onClick={() => doCancel(o.id)}
                              className="text-xs font-medium px-2 py-1 rounded-lg"
                              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </AppLayout>
  );
}

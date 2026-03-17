import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, TrendingUp, TrendingDown, X, Wallet } from 'lucide-react';
import { fetchPortfolios, createPortfolio, addHolding, deletePortfolio } from '@/api/portfolio';
import { apiClient } from '@/api/client';
import { formatCurrency, formatPct } from '@/utils/formatters';
import { AppLayout } from '@/components/AppLayout';
import toast from 'react-hot-toast';

async function fetchPnL(portfolioId: number) {
  const { data } = await apiClient.get(`/portfolio/${portfolioId}/pnl`);
  return data;
}

function AddHoldingModal({ portfolioId, onClose }: { portfolioId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => addHolding(portfolioId, { ticker: ticker.toUpperCase(), shares: Number(shares), avg_cost: Number(avgCost) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolios'] });
      qc.invalidateQueries({ queryKey: ['pnl', portfolioId] });
      toast.success('Holding added');
      onClose();
    },
    onError: () => toast.error('Failed to add holding'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>Add Holding</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Ticker (e.g. AAPL)', value: ticker, set: (v: string) => setTicker(v.toUpperCase()), type: 'text' },
            { label: 'Shares', value: shares, set: setShares, type: 'number' },
            { label: 'Avg cost per share ($)', value: avgCost, set: setAvgCost, type: 'number' },
          ].map(({ label, value, set, type }) => (
            <input
              key={label}
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={label}
              type={type}
              min={type === 'number' ? '0' : undefined}
              className="w-full px-3 py-2.5 text-sm"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
            />
          ))}
          <button
            onClick={() => mutate()}
            disabled={isPending || !ticker || !shares || !avgCost}
            className="btn-gradient w-full py-2.5 rounded-xl text-sm"
          >
            {isPending ? 'Adding…' : 'Add Holding'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PortfolioCard({ portfolio }: { portfolio: any }) {
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();

  const { data: pnl } = useQuery({
    queryKey: ['pnl', portfolio.id],
    queryFn: () => fetchPnL(portfolio.id),
    enabled: (portfolio.holdings?.length ?? 0) > 0,
  });

  const { mutate: del } = useMutation({
    mutationFn: () => deletePortfolio(portfolio.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portfolios'] }); toast.success('Portfolio deleted'); },
  });

  const isProfit = (pnl?.unrealized_pnl ?? 0) >= 0;

  return (
    <div className="card p-6 mb-4">
      {showAdd && <AddHoldingModal portfolioId={portfolio.id} onClose={() => setShowAdd(false)} />}

      {/* Card header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-subtle)' }}>
            <Wallet className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>{portfolio.name}</h3>
            {portfolio.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{portfolio.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg btn-gradient"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          <button
            onClick={() => del()}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PnL summary */}
      {pnl && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Value', value: formatCurrency(pnl.total_value), color: 'var(--text-primary)', accent: false },
            { label: 'Cost Basis', value: formatCurrency(pnl.total_cost), color: 'var(--text-secondary)', accent: false },
            {
              label: 'Unrealized P&L',
              value: `${formatCurrency(pnl.unrealized_pnl)} (${formatPct(pnl.pnl_pct)})`,
              color: isProfit ? 'var(--accent-green)' : 'var(--accent-red)',
              accent: true,
            },
          ].map(({ label, value, color, accent }) => (
            <div
              key={label}
              className="rounded-xl p-3"
              style={{
                background: accent
                  ? isProfit ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'
                  : 'var(--bg-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-sm font-semibold font-mono flex items-center gap-1" style={{ color }}>
                {accent && (isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Holdings table */}
      {portfolio.holdings?.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Ticker', 'Shares', 'Avg Cost', ...(pnl ? ['Cur Price', 'P&L'] : [])].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((h: any, idx: number) => {
                const hPnl = pnl?.holdings?.find((x: any) => x.ticker === h.ticker);
                const hPos = (hPnl?.unrealized_pnl ?? 0) >= 0;
                return (
                  <tr
                    key={h.id}
                    style={{
                      background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td className="py-3 px-3 font-display font-bold text-sm" style={{ color: 'var(--accent-blue)' }}>{h.ticker}</td>
                    <td className="py-3 px-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{Number(h.shares).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(Number(h.avg_cost))}</td>
                    {pnl && <td className="py-3 px-3 font-mono" style={{ color: 'var(--text-primary)' }}>{hPnl ? formatCurrency(hPnl.current_price) : '–'}</td>}
                    {pnl && (
                      <td className="py-3 px-3">
                        {hPnl ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${hPos ? 'badge-positive' : 'badge-negative'}`}
                          >
                            {hPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {formatCurrency(hPnl.unrealized_pnl)} ({formatPct(hPnl.pnl_pct)})
                          </span>
                        ) : '–'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
          No holdings yet. Click "Add" to add your first position.
        </p>
      )}
    </div>
  );
}

export function Portfolio() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: portfolios, isLoading } = useQuery({ queryKey: ['portfolios'], queryFn: fetchPortfolios });

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => createPortfolio({ name: newName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolios'] });
      setNewName(''); setShowCreate(false);
      toast.success('Portfolio created');
    },
    onError: () => toast.error('Failed to create portfolio'),
  });

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>Portfolio</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Track your positions and unrealized P&L</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" /> New Portfolio
        </button>
      </div>

      {showCreate && (
        <div
          className="card p-5 flex gap-3 mb-6"
          style={{ border: '1px solid var(--border-accent)' }}
        >
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Portfolio name"
            onKeyDown={e => e.key === 'Enter' && newName && create()}
            className="flex-1 px-3 py-2.5 text-sm"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => create()}
            disabled={isPending || !newName}
            className="btn-gradient px-5 py-2.5 rounded-xl text-sm"
          >
            {isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {isLoading && <div className="skeleton rounded-2xl h-48" />}

      {portfolios?.map((p: any) => <PortfolioCard key={p.id} portfolio={p} />)}

      {!isLoading && portfolios?.length === 0 && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full card text-center p-12"
          style={{ borderStyle: 'dashed' }}
        >
          <Wallet className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--accent-blue)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>No portfolios yet</p>
          <p className="text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>Create your first one →</p>
        </button>
      )}
    </AppLayout>
  );
}

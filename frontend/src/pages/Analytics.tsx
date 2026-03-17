import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { runDCF, runBacktest } from '@/api/analytics';
import { formatCurrency, formatPct } from '@/utils/formatters';
import { TrendingUp, TrendingDown, Calculator, Activity } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import toast from 'react-hot-toast';

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <p className="text-xs mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-mono font-bold text-sm" style={{ color: color ?? 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2.5 text-sm"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function DCFSection() {
  const [ticker, setTicker] = useState('');
  const [wacc,   setWacc]   = useState('0.10');
  const [tgr,    setTgr]    = useState('0.025');
  const [years,  setYears]  = useState('5');
  const [gr,     setGr]     = useState('0.05');

  const { mutate, data, isPending, isError } = useMutation({
    mutationFn: () => runDCF(ticker.toUpperCase(), {
      wacc: Number(wacc),
      terminal_growth_rate: Number(tgr),
      projection_years: Number(years),
    }),
    onError: () => toast.error('DCF failed — check ticker'),
  });

  const upside = data?.upside_pct ?? 0;

  return (
    <div className="card p-6 h-fit">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,110,247,0.12)' }}>
          <Calculator className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div>
          <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>DCF Valuation</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>2-stage Discounted Cash Flow model</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Ticker Symbol</label>
          <input
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            className="w-full px-3 py-2.5 text-sm font-mono"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="WACC" value={wacc} onChange={e => setWacc(e.target.value)} type="number" step="0.01" />
          <InputField label="Terminal Growth Rate" value={tgr} onChange={e => setTgr(e.target.value)} type="number" step="0.005" />
          <InputField label="Projection Years" value={years} onChange={e => setYears(e.target.value)} type="number" min="1" max="20" />
          <InputField label="FCF Growth Rate" value={gr} onChange={e => setGr(e.target.value)} type="number" step="0.01" />
        </div>
      </div>

      <button
        onClick={() => mutate()}
        disabled={isPending || !ticker}
        className="btn-gradient w-full py-3 rounded-xl text-sm mb-4"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Running DCF…
          </span>
        ) : 'Run DCF Valuation'}
      </button>

      {isError && (
        <p className="text-sm text-center py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
          Missing fundamental data or invalid ticker
        </p>
      )}

      {data && !data.error && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <MetricCard label="Intrinsic Value" value={formatCurrency(data.intrinsic_value_per_share)} />
          <MetricCard label="Current Price"   value={formatCurrency(data.current_price)} />
          <MetricCard
            label="Upside"
            value={formatPct(upside)}
            color={upside >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
          />
          <MetricCard
            label="Margin of Safety"
            value={formatPct(data.margin_of_safety * 100)}
            color={data.margin_of_safety >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
          />
          <MetricCard label="PV Stage 1"   value={formatCurrency(data.pv_stage1)} />
          <MetricCard label="PV Terminal"  value={formatCurrency(data.pv_terminal)} />
          <MetricCard label="Base FCF"     value={`$${(data.base_fcf / 1e9).toFixed(2)}B`} />
          <MetricCard label="Shares Out"   value={`${(data.shares_outstanding / 1e9).toFixed(2)}B`} />
        </div>
      )}
      {data?.error && (
        <p className="text-sm mt-3 text-center" style={{ color: 'var(--accent-yellow)' }}>{data.error}</p>
      )}
    </div>
  );
}

function BacktestSection() {
  const [ticker, setTicker] = useState('');
  const [fast,   setFast]   = useState('20');
  const [slow,   setSlow]   = useState('50');
  const [range,  setRange]  = useState('2Y');

  const { mutate, data, isPending, isError } = useMutation({
    mutationFn: () => runBacktest(ticker.toUpperCase(), { fast: Number(fast), slow: Number(slow), range }),
    onError: () => toast.error('Backtest failed'),
  });

  return (
    <div className="card p-6 h-fit">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)' }}>
          <Activity className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
        </div>
        <div>
          <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>MA Crossover Backtest</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Moving average strategy simulation</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Ticker Symbol</label>
          <input
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            className="w-full px-3 py-2.5 text-sm font-mono"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Fast MA (days)" value={fast} onChange={e => setFast(e.target.value)} type="number" min="1" />
          <InputField label="Slow MA (days)" value={slow} onChange={e => setSlow(e.target.value)} type="number" min="1" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>Range</label>
          <div className="flex gap-2">
            {['1Y', '2Y', '5Y'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="tab-pill"
                style={range === r ? { background: 'var(--gradient-hero)', color: '#fff' } : {}}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => mutate()}
        disabled={isPending || !ticker}
        className="w-full py-3 rounded-xl text-sm font-semibold mb-4 transition-all"
        style={{
          background: isPending || !ticker ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7c3aed,#4f6ef7)',
          color: '#fff',
          cursor: isPending || !ticker ? 'not-allowed' : 'pointer',
        }}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Running Backtest…
          </span>
        ) : 'Run Backtest'}
      </button>

      {isError && (
        <p className="text-sm text-center py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
          Failed — check ticker or adjust parameters
        </p>
      )}

      {data && !data.error && (
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard label="Total Return"       value={formatPct(data.total_return * 100)}       color={data.total_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
            <MetricCard label="Annualized Return"  value={formatPct(data.annualized_return * 100)}  color={data.annualized_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
            <MetricCard label="Sharpe Ratio"       value={data.sharpe.toFixed(2)} />
            <MetricCard label="Max Drawdown"       value={formatPct(data.max_drawdown * 100)}       color="var(--accent-red)" />
            <MetricCard label="Win Rate"           value={formatPct(data.win_rate * 100)} />
            <MetricCard label="# Trades"           value={String(data.num_trades)} />
          </div>

          {data.signals?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Recent Signals</p>
              <div
                className="max-h-40 overflow-y-auto rounded-xl"
                style={{ border: '1px solid var(--border)' }}
              >
                {data.signals.slice(-10).reverse().map((s: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                    style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}
                  >
                    <span
                      className="flex items-center gap-1.5 font-semibold"
                      style={{ color: s.type === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' }}
                    >
                      {s.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {s.type}
                    </span>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(s.price)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.timestamp?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {data?.error && <p className="text-sm mt-3 text-center" style={{ color: 'var(--accent-yellow)' }}>{data.error}</p>}
    </div>
  );
}

export function Analytics() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Valuation models and quantitative strategy backtesting</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DCFSection />
        <BacktestSection />
      </div>
    </AppLayout>
  );
}

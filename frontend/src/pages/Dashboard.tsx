import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, TrendingDown, Wallet, Activity, Clock } from 'lucide-react';
import { fetchQuote } from '@/api/stocks';
import { fetchPortfolios } from '@/api/portfolio';
import { formatCurrency, formatPct, formatLargeNumber } from '@/utils/formatters';
import { AppLayout } from '@/components/AppLayout';

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM'];

function QuoteCard({ ticker }: { ticker: string }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['quote', ticker],
    queryFn: () => fetchQuote(ticker),
    refetchInterval: 30_000,
  });

  if (isLoading) return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-3 w-12 rounded" />
      <div className="skeleton h-6 w-20 rounded" />
      <div className="skeleton h-3 w-16 rounded" />
    </div>
  );

  if (isError || !data) return (
    <div className="card p-5">
      <p className="font-display font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>{ticker}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>Failed to load</p>
    </div>
  );

  const isPos = data.change_pct >= 0;

  return (
    <button
      onClick={() => navigate(`/stocks/${ticker}`)}
      className="card card-hover p-4 text-left group w-full transition-all"
    >
      {/* Row 1: Ticker symbol */}
      <p className="font-display font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.ticker}
      </p>

      {/* Row 2: Percent change badge — full width, never overflows */}
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${isPos ? 'badge-positive' : 'badge-negative'}`}
      >
        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {formatPct(data.change_pct)}
      </span>

      {/* Row 3: Company name */}
      <p className="text-xs truncate mb-2" style={{ color: 'var(--text-muted)' }}>
        {data.name}
      </p>

      {/* Row 4: Price */}
      <p className="font-mono font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
        {formatCurrency(data.price)}
      </p>

      {/* Row 5: Volume */}
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        Vol: {formatLargeNumber(data.volume)}
      </p>
    </button>
  );
}

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="card p-6 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="stat-number" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: fetchPortfolios,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/stocks/${search.trim().toUpperCase()}`);
  };

  const totalHoldings = portfolios?.reduce((acc: number, p: any) => acc + (p.holdings?.length ?? 0), 0) ?? 0;

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
          Market Overview
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Real-time market data and portfolio intelligence
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Portfolios"
          value={String(portfolios?.length ?? 0)}
          sub={`${totalHoldings} total holdings`}
          icon={Wallet}
          color="var(--accent-blue)"
        />
        <StatCard
          label="Watchlist"
          value={String(DEFAULT_TICKERS.length)}
          sub="Tickers tracked"
          icon={Activity}
          color="var(--accent-purple)"
        />
        <StatCard
          label="Market Status"
          value="Open"
          sub="NYSE & NASDAQ"
          icon={Clock}
          color="var(--accent-green)"
        />
        <StatCard
          label="Data Feed"
          value="Live"
          sub="30s refresh"
          icon={TrendingUp}
          color="var(--accent-yellow)"
        />
      </div>

      {/* Search */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value.toUpperCase())}
              placeholder="Search ticker — e.g. AAPL"
              className="w-full pl-10 pr-4 py-2.5 text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)' }}
            />
          </div>
          <button type="submit" className="btn-gradient px-5 py-2.5 rounded-xl text-sm">
            Search
          </button>
        </form>
      </div>

      {/* Market movers */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Market Movers
          </h2>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {DEFAULT_TICKERS.map(t => <QuoteCard key={t} ticker={t} />)}
        </div>
      </section>

      {/* Portfolios */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Your Portfolios
          </h2>
          <button
            onClick={() => navigate('/portfolio')}
            className="text-xs font-medium transition-colors hover:underline"
            style={{ color: 'var(--accent-blue)' }}
          >
            Manage →
          </button>
        </div>

        {portfolios && portfolios.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map((p: any) => (
              <button
                key={p.id}
                onClick={() => navigate('/portfolio')}
                className="card card-hover p-6 text-left w-full"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'var(--gradient-subtle)' }}
                >
                  <Wallet className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                </div>
                <h3 className="font-display font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  {p.name}
                </h3>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {p.description || 'No description'}
                </p>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--accent-blue)' }}
                >
                  {p.holdings?.length ?? 0} holdings
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => navigate('/portfolio')}
            className="w-full card card-hover text-center p-10"
            style={{ borderStyle: 'dashed' }}
          >
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              No portfolios yet
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>
              Create your first portfolio →
            </p>
          </button>
        )}
      </section>
    </AppLayout>
  );
}

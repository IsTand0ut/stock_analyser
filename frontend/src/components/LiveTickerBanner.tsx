import { useQuery } from '@tanstack/react-query';
import { fetchQuote } from '@/api/stocks';
import { formatCurrency, formatPct } from '@/utils/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'BRK-B', 'V'];

function TickerItem({ ticker }: { ticker: string }) {
  const { data } = useQuery({
    queryKey: ['quote', ticker],
    queryFn: () => fetchQuote(ticker),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const navigate = useNavigate();

  if (!data || data.price === 0) {
    return (
      <div className="flex items-center gap-2 px-5 select-none opacity-50">
        <span className="font-mono font-bold text-xs" style={{ color: 'var(--text-secondary)' }}>{ticker}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      </div>
    );
  }

  const isPos = data.change_pct >= 0;

  return (
    <button
      onClick={() => navigate(`/stocks/${ticker}`)}
      className="flex items-center gap-2.5 px-5 transition-opacity hover:opacity-80 cursor-pointer select-none border-r"
      style={{ borderColor: 'var(--border)' }}
    >
      <span className="font-mono font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
        {ticker}
      </span>
      <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {formatCurrency(data.price)}
      </span>
      <span
        className="flex items-center gap-0.5 text-xs font-semibold tabular-nums"
        style={{ color: isPos ? 'var(--accent-green)' : 'var(--accent-red)' }}
      >
        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {formatPct(data.change_pct)}
      </span>
    </button>
  );
}

export function LiveTickerBanner() {
  // Duplicate items so the scroll looks seamless
  const items = [...TICKERS, ...TICKERS];

  return (
    <div
      className="overflow-hidden border-b"
      style={{
        height: '36px',
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="ticker-track h-full items-center flex">
        {items.map((t, i) => (
          <TickerItem key={`${t}-${i}`} ticker={t} />
        ))}
      </div>
    </div>
  );
}

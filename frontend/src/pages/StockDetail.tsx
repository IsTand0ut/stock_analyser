import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart2, Zap } from 'lucide-react';
import { fetchQuote, fetchFundamentals, fetchHistory } from '@/api/stocks';
import { fetchSentiment } from '@/api/analytics';
import { formatCurrency, formatPct, formatLargeNumber } from '@/utils/formatters';
import { AppLayout } from '@/components/AppLayout';
import { TradeModal } from '@/components/trading/TradeModal';

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'] as const;
const TABS = ['Overview', 'Fundamentals', 'News'] as const;
type Tab = typeof TABS[number];

function MiniPriceChart({ history, quote: _quote }: { history: any; quote: any }) {
  if (!history?.data || history.data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div className="text-center">
          <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No historical data available</p>
        </div>
      </div>
    );
  }

  const W = 800;
  const H = 200;
  const PAD = { top: 16, right: 8, bottom: 36, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Sample down to max 200 pts
  const raw = history.data;
  const step = Math.max(1, Math.floor(raw.length / 200));
  const pts = raw.filter((_: any, i: number) => i % step === 0);

  if (pts.length === 1) {
    const only = pts[0];
    return (
      <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div className="text-center">
          <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Limited history available for this symbol</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Latest close: {formatCurrency(only.close)}
          </p>
        </div>
      </div>
    );
  }

  const closes = pts.map((b: any) => b.close);
  const minC = Math.min(...closes);
  const maxC = Math.max(...closes);
  const rangeC = maxC - minC || 1;

  const isOverallPos = closes[closes.length - 1] >= closes[0];
  const lineColor = isOverallPos ? 'var(--accent-green)' : 'var(--accent-red)';
  const fillId = `chart-fill-${isOverallPos ? 'green' : 'red'}`;

  const toX = (i: number) => PAD.left + (i / (pts.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + (1 - (v - minC) / rangeC) * chartH;

  const polyPoints = pts.map((b: any, i: number) => `${toX(i)},${toY(b.close)}`).join(' ');
  const areaPoints = [
    `${toX(0)},${PAD.top + chartH}`,
    ...pts.map((b: any, i: number) => `${toX(i)},${toY(b.close)}`),
    `${toX(pts.length - 1)},${PAD.top + chartH}`,
  ].join(' ');

  // Y axis labels
  const yLabels = [maxC, (maxC + minC) / 2, minC];
  // X axis time labels (first, mid, last)
  const timeLabels = [0, Math.floor(pts.length / 2), pts.length - 1].map(i => ({
    x: toX(i),
    label: pts[i]?.timestamp
      ? new Date(pts[i].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '',
  }));

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: '260px' }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
          </linearGradient>
          {/* Clip to chart area */}
          <clipPath id="chart-clip">
            <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {/* Y-axis grid lines */}
        {yLabels.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={toY(v)}
              x2={PAD.left + chartW} y2={toY(v)}
              stroke="#1e1e3a" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={toY(v) + 4}
              textAnchor="end"
              fontSize="10"
              fill="#5a5a7a"
            >
              ${v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* X-axis time labels */}
        {timeLabels.map(({ x, label }, i) => (
          <text
            key={i}
            x={x} y={H - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#5a5a7a"
          >
            {label}
          </text>
        ))}

        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={`url(#${fillId})`}
          clipPath="url(#chart-clip)"
        />

        {/* Line */}
        <polyline
          points={polyPoints}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath="url(#chart-clip)"
        />

        {/* Last point dot */}
        {pts.length > 0 && (
          <circle
            cx={toX(pts.length - 1)}
            cy={toY(closes[closes.length - 1])}
            r="4"
            fill={lineColor}
            stroke="var(--bg-card)"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}


function FundamentalsTable({ fundamentals }: { fundamentals: any }) {
  if (!fundamentals) return (
    <div className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading fundamentals…</div>
  );

  const hasAnyMetric = [
    fundamentals.pe_ratio,
    fundamentals.eps,
    fundamentals.roe,
    fundamentals.debt_to_equity,
    fundamentals.free_cash_flow,
    fundamentals.beta,
    fundamentals.gross_margin,
    fundamentals.operating_margin,
  ].some((v) => v !== null && v !== undefined);

  if (!hasAnyMetric) {
    return (
      <div className="px-4 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Fundamental metrics are temporarily unavailable from the upstream provider.
      </div>
    );
  }

  const rows = [
    { label: 'P/E Ratio',        value: fundamentals.pe_ratio?.toFixed(2) },
    { label: 'EPS (TTM)',         value: fundamentals.eps ? formatCurrency(fundamentals.eps) : null },
    { label: 'Return on Equity',  value: fundamentals.roe ? formatPct(fundamentals.roe * 100) : null },
    { label: 'Debt / Equity',     value: fundamentals.debt_to_equity?.toFixed(2) },
    { label: 'Free Cash Flow',    value: formatLargeNumber(fundamentals.free_cash_flow) },
    { label: 'Beta',              value: fundamentals.beta?.toFixed(2) },
    { label: 'Gross Margin',      value: fundamentals.gross_margin ? formatPct(fundamentals.gross_margin * 100) : null },
    { label: 'Operating Margin',  value: fundamentals.operating_margin ? formatPct(fundamentals.operating_margin * 100) : null },
  ];

  return (
    <div>
      {rows.map(({ label, value }, i) => (
        <div
          key={label}
          className="flex justify-between items-center px-4 py-3"
          style={{
            background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>
            {value ?? <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function NewsPanel({ sentiment }: { sentiment: any }) {
  if (!sentiment || sentiment.length === 0) return (
    <div className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
      {sentiment === undefined ? 'Loading news…' : 'No news available (API key required)'}
    </div>
  );

  return (
    <div className="space-y-2">
      {sentiment.map((item: any, i: number) => {
        const sentColor =
          item.sentiment_label === 'positive' ? 'var(--accent-green)' :
          item.sentiment_label === 'negative' ? 'var(--accent-red)' :
          'var(--text-muted)';
        return (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl p-4 transition-colors"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div className="flex items-start gap-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{ background: sentColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {item.source}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.published_at?.slice(0, 10)}
                  </span>
                  <span
                    className="text-xs font-semibold capitalize"
                    style={{ color: sentColor }}
                  >
                    {item.sentiment_label}
                  </span>
                </div>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<string>('3M');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [showTrade, setShowTrade] = useState(false);

  const sym = ticker?.toUpperCase() ?? '';

  const { data: quote, isLoading: qLoading } = useQuery({
    queryKey: ['quote', sym],
    queryFn: () => fetchQuote(sym),
    enabled: Boolean(sym),
    refetchInterval: 30_000,
  });

  const { data: fundamentals } = useQuery({
    queryKey: ['fundamentals', sym],
    queryFn: () => fetchFundamentals(sym),
    enabled: Boolean(sym),
  });

  const { data: sentiment } = useQuery({
    queryKey: ['sentiment', sym],
    queryFn: () => fetchSentiment(sym),
    enabled: Boolean(sym),
  });

  const { data: history } = useQuery({
    queryKey: ['history', sym, range],
    queryFn: () => fetchHistory(sym, range),
    enabled: Boolean(sym),
  });

  const isPos = (quote?.change_pct ?? 0) >= 0;

  return (
    <AppLayout showTicker={false}>
      {showTrade && (
        <TradeModal
          ticker={sym}
          currentPrice={quote?.price}
          onClose={() => setShowTrade(false)}
        />
      )}

      {/* Back nav */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span style={{ color: 'var(--border-accent)' }}>/</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{sym}</span>
        </div>
        <button
          onClick={() => setShowTrade(true)}
          className="btn-gradient flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
        >
          <Zap className="w-3.5 h-3.5" /> Trade {sym}
        </button>
      </div>

      {/* Quote Hero */}
      {qLoading ? (
        <div className="skeleton rounded-2xl h-32 mb-6" />
      ) : quote ? (
        <div
          className="rounded-2xl p-6 mb-6 glow-blue"
          style={{
            background: 'linear-gradient(135deg, rgba(79,110,247,0.08) 0%, rgba(124,58,237,0.08) 100%)',
            border: '1px solid var(--border-accent)',
          }}
        >
          <div className="flex flex-wrap gap-6 items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {quote.name} · Real-time
              </p>
              <p className="font-display font-bold text-5xl mb-2" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(quote.price)}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${isPos ? 'badge-positive' : 'badge-negative'}`}
              >
                {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {formatPct(quote.change_pct)} ({isPos ? '+' : ''}{formatCurrency(quote.change)})
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 ml-auto">
              {[
                ['Volume',     formatLargeNumber(quote.volume)],
                ['Avg Volume', formatLargeNumber(quote.avg_volume)],
                ['Mkt Cap',    formatLargeNumber(quote.market_cap)],
                ['52W Range',  `${formatCurrency(quote.fifty_two_week_low)} – ${formatCurrency(quote.fifty_two_week_high)}`],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{l}</p>
                  <p className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab navigation */}
      <div className="flex items-center gap-2 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Overview (Chart) */}
      {activeTab === 'Overview' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Price Chart
            </h2>
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="tab-pill"
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    background: range === r ? 'var(--gradient-hero)' : 'transparent',
                    color: range === r ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <MiniPriceChart history={history} quote={quote} />
        </div>
      )}

      {/* Tab: Fundamentals */}
      {activeTab === 'Fundamentals' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Fundamental Metrics
            </h2>
          </div>
          <FundamentalsTable fundamentals={fundamentals} />
        </div>
      )}

      {/* Tab: News */}
      {activeTab === 'News' && (
        <div>
          <h2 className="font-display font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>
            News & Sentiment
          </h2>
          <NewsPanel sentiment={sentiment} />
        </div>
      )}
    </AppLayout>
  );
}

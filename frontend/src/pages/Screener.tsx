import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { compareTickers } from '@/api/stocks';
import { Search, ExternalLink, Filter, AlertCircle } from 'lucide-react';
import { formatLargeNumber, formatPct } from '@/utils/formatters';
import { AppLayout } from '@/components/AppLayout';
import { useDebounce } from '@/hooks/useDebounce';

/** Valid US ticker: 1-5 uppercase letters, optionally followed by -A/B/C class suffix */
const TICKER_RE = /^[A-Z]{1,5}(-[A-Z])?$/;

function validateTickers(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  return {
    valid:   parts.filter(t => TICKER_RE.test(t)).slice(0, 8),
    invalid: parts.filter(t => !TICKER_RE.test(t)),
  };
}

function NullCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-right text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
      {children ?? <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
    </td>
  );
}

const HEADERS = ['Ticker', 'P/E', 'EPS', 'ROE', 'D/E', 'FCF', 'Beta', 'Gross Margin', 'Op Margin', ''];

export function Screener() {
  const navigate = useNavigate();
  const [input, setInput] = useState('AAPL,MSFT,GOOGL');
  const [validationError, setValidationError] = useState('');

  // Debounce the raw input — only triggers the query 600ms after the user stops typing
  const debouncedInput = useDebounce(input, 600);

  const { valid: debouncedTickers, invalid } = useMemo(
    () => validateTickers(debouncedInput),
    [debouncedInput],
  );

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['compare', debouncedTickers.join(',')],
    queryFn: () => compareTickers(debouncedTickers),
    enabled: debouncedTickers.length > 0,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value.toUpperCase());
    setValidationError('');
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
          Screener
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Compare fundamental metrics across multiple tickers — up to 8 at once
        </p>
      </div>

      {/* Search bar — debounced, no submit button needed */}
      <div className="mb-2">
        <div className="relative max-w-2xl">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Type tickers separated by commas — e.g. AAPL,MSFT,GOOGL,NVDA"
            className="w-full pl-10 pr-4 py-3 text-sm"
            style={{
              background: 'var(--bg-secondary)',
              border: `1px solid ${validationError ? 'var(--accent-red)' : 'var(--border)'}`,
              borderRadius: '10px',
              color: 'var(--text-primary)',
            }}
            aria-label="Ticker search input"
          />
          {/* Fetching indicator */}
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin inline-block"
                style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
              />
            </div>
          )}
        </div>

        {/* Validation warnings */}
        {invalid.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs mt-2" style={{ color: 'var(--accent-yellow)' }}>
            <AlertCircle className="w-3.5 h-3.5" />
            Invalid tickers skipped: {invalid.join(', ')}
          </p>
        )}
        {debouncedTickers.length === 8 && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Max 8 tickers shown</p>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="card overflow-hidden mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="skeleton h-4 w-14 rounded" />
              {[...Array(8)].map((_, j) => <div key={j} className="skeleton h-4 w-12 rounded ml-auto" />)}
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div
          className="text-sm text-center py-4 rounded-xl mt-6 flex items-center justify-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle className="w-4 h-4" />
          Failed to fetch comparison data. Check tickers and try again.
        </div>
      )}

      {data && data.length > 0 && !isLoading && (
        <div className="card overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  {HEADERS.map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((f: any, idx: number) => (
                  <tr
                    key={f.ticker}
                    style={{
                      background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)')}
                  >
                    <td className="px-4 py-3">
                      <span className="font-display font-bold text-sm" style={{ color: 'var(--accent-blue)' }}>
                        {f.ticker}
                      </span>
                    </td>
                    <NullCell>{f.pe_ratio?.toFixed(2)}</NullCell>
                    <NullCell>{f.eps ? `$${f.eps.toFixed(2)}` : null}</NullCell>
                    <NullCell>{f.roe ? formatPct(f.roe * 100) : null}</NullCell>
                    <NullCell>{f.debt_to_equity?.toFixed(2)}</NullCell>
                    <NullCell>{f.free_cash_flow ? formatLargeNumber(f.free_cash_flow) : null}</NullCell>
                    <NullCell>{f.beta?.toFixed(2)}</NullCell>
                    <NullCell>{f.gross_margin ? formatPct(f.gross_margin * 100) : null}</NullCell>
                    <NullCell>{f.operating_margin ? formatPct(f.operating_margin * 100) : null}</NullCell>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/stocks/${f.ticker}`)}
                        className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                        style={{ color: 'var(--accent-blue)' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {debouncedTickers.length === 0 && (
        <div
          className="card text-center p-16 mt-6"
          style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}
        >
          <Filter className="w-8 h-8 mx-auto mb-3 opacity-25" style={{ color: 'var(--accent-blue)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            Type one or more tickers above to compare
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Examples: AAPL, MSFT, GOOGL, NVDA, TSLA, META, JPM, V
          </p>
        </div>
      )}
    </AppLayout>
  );
}

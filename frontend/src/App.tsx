import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy-loaded pages — each page is a separate chunk, loaded on demand
const Dashboard   = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const StockDetail = lazy(() => import('@/pages/StockDetail').then(m => ({ default: m.StockDetail })));
const Portfolio   = lazy(() => import('@/pages/Portfolio').then(m => ({ default: m.Portfolio })));
const Analytics   = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));
const Screener    = lazy(() => import('@/pages/Screener').then(m => ({ default: m.Screener })));
const Login       = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const Trading     = lazy(() => import('@/pages/Trading').then(m => ({ default: m.Trading })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 — those are auth errors
        if (error?.response?.status === 401 || error?.response?.status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000), // exponential backoff: 1s, 2s, 4s…
    },
  },
});

/** Full-screen skeleton shown while a lazy page chunk is loading */
function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--gradient-hero)' }}
        >
          <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="/stocks/:ticker" element={
              <PrivateRoute>
                <ErrorBoundary>
                  <StockDetail />
                </ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="/portfolio" element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Portfolio />
                </ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="/analytics" element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Analytics />
                </ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="/screener" element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Screener />
                </ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="/trading" element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Trading />
                </ErrorBoundary>
              </PrivateRoute>
            } />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: 'var(--accent-green)', secondary: 'var(--bg-card)' } },
          error:   { iconTheme: { primary: 'var(--accent-red)',   secondary: 'var(--bg-card)' } },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

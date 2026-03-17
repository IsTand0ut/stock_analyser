import { Navbar } from './Navbar';
import { LiveTickerBanner } from './LiveTickerBanner';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Set to false to hide the ticker banner (e.g. on detail pages) */
  showTicker?: boolean;
}

export function AppLayout({ children, showTicker = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />
      {/* Offset for fixed navbar (60px) */}
      <div style={{ paddingTop: '60px' }}>
        {showTicker && <LiveTickerBanner />}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

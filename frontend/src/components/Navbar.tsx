import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart2, Bell, User, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const NAV_LINKS = [
  { label: 'Dashboard',  path: '/' },
  { label: 'Portfolio',  path: '/portfolio' },
  { label: 'Analytics',  path: '/analytics' },
  { label: 'Screener',   path: '/screener' },
  { label: 'Trading',    path: '/trading' },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const online = useOnlineStatus();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-[60px]"
      style={{
        background: 'rgba(10,10,15,0.85)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Logo */}
      <button onClick={() => navigate('/')} className="flex items-center gap-2.5 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--gradient-hero)' }}
        >
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
          StockIQ
        </span>
      </button>

      {/* Center Nav */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(({ label, path }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={{
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(79,110,247,0.08)' : 'transparent',
              }}
            >
              {label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                  style={{ background: 'var(--accent-blue)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Offline indicator */}
        {!online && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <WifiOff className="w-3 h-3" />
            Offline
          </div>
        )}

        {/* Online status dot */}
        {online && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--accent-green)', boxShadow: '0 0 6px var(--accent-green)' }}
            />
            <span className="hidden sm:inline">Live</span>
          </div>
        )}

        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Sign out"
        >
          <User className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}

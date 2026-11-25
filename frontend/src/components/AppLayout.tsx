import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Home,
  LifeBuoy,
  Link2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Plus,
  PlusCircle,
  QrCode,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useLinkStore } from '../store/useLinkStore';
import { WebsiteGuideAgent } from './WebsiteGuideAgent';

interface AppLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/create', label: 'Create Link', icon: PlusCircle, end: false },
  { to: '/links', label: 'My Links', icon: Link2, end: false },
  { to: '/qr-codes', label: 'QR Codes', icon: QrCode, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/manage', label: 'Link Management', icon: SlidersHorizontal, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { token, user, theme, toggleTheme, logout } = useAuthStore();
  const resetLinks = useLinkStore((s) => s.reset);
  const isAuthenticated = Boolean(token);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const handleLogout = () => {
    resetLinks();
    logout();
    navigate('/');
  };

  const handleGlobalSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim();
    const targetPath = q ? `/links?q=${encodeURIComponent(q)}` : '/links';
    navigate(targetPath);
    setMobileOpen(false);
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Brand Row */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        <NavLink
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 overflow-hidden"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-sm">
            <QrCode className="h-5 w-5" />
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  LINKORA
                </span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  QR
                </span>
              </div>
              <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Dynamic Link Platform
              </p>
            </div>
          )}
        </NavLink>

        {mobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 lg:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Primary Create Action */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            navigate('/create');
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 ${
            collapsed && !mobile ? 'px-0' : ''
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {(!collapsed || mobile) && <span>Create new</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            title={collapsed && !mobile ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
              } ${collapsed && !mobile ? 'justify-center px-2' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {(!collapsed || mobile) && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* QR Rescue Status Footer */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        {(!collapsed || mobile) && (
          <div className="mb-2 rounded-xl border border-teal-200 bg-teal-50/70 p-2.5 text-xs dark:border-teal-500/20 dark:bg-teal-500/10">
            <div className="flex items-center gap-1.5 font-semibold text-teal-800 dark:text-teal-300">
              <LifeBuoy className="h-3.5 w-3.5" />
              QR Rescue Active
            </div>
            <p className="mt-0.5 text-[11px] text-teal-700/90 dark:text-teal-200/80">
              Edit target URLs anytime without changing printed QR codes.
            </p>
          </div>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 ${
              collapsed && !mobile ? 'justify-center px-2' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {(!collapsed || mobile) && <span>Sign out</span>}
          </button>
        ) : (
          <Link
            to="/login"
            onClick={() => setMobileOpen(false)}
            title={collapsed && !mobile ? 'Save data to an account' : undefined}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 ${
              collapsed && !mobile ? 'justify-center px-2' : ''
            }`}
          >
            <Save className="h-4 w-4 shrink-0" />
            {(!collapsed || mobile) && <span>Save data (Sign in)</span>}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F4F6FA] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 lg:block ${
          collapsed ? 'w-[72px]' : 'w-60'
        }`}
      >
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 h-full w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <form onSubmit={handleGlobalSearch} className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search links, slugs, or destinations..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </form>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {isAuthenticated ? (
              <NavLink
                to="/settings"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden text-xs font-semibold text-slate-800 dark:text-slate-100 sm:inline">
                  {user?.name ?? 'Account'}
                </span>
              </NavLink>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="hidden items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 sm:inline-flex"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <WebsiteGuideAgent />
    </div>
  );
}

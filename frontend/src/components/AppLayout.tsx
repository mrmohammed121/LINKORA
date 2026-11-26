import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Plus,
  PlusCircle,
  QrCode,
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
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/links', label: 'My Links', icon: Link2, end: false },
  { to: '/create', label: 'Create Short Link', icon: PlusCircle, end: false },
  { to: '/qr-codes', label: 'QR Code Studio', icon: QrCode, end: false },
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
    navigate(q ? `/links?q=${encodeURIComponent(q)}` : '/links');
    setMobileOpen(false);
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col bg-[#27272A] text-white">
      {/* Brand Row */}
      <div className="flex h-16 items-center justify-between border-b border-[#3F3F46] px-4">
        <NavLink
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 overflow-hidden"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E9FFDB] text-[#18181B] shadow-xs">
            <Link2 className="h-5 w-5 stroke-[2.4]" />
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-white">
                  LINKORA
                </span>
                <span className="rounded bg-[#E9FFDB]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#E9FFDB]">
                  PRO
                </span>
              </div>
              <p className="truncate text-[10px] font-medium text-zinc-400">
                URL &amp; QR Platform
              </p>
            </div>
          )}
        </NavLink>

        {mobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-[#3F3F46] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-7 w-7 items-center justify-center rounded-full border border-[#3F3F46] bg-[#18181B] text-zinc-300 transition hover:border-[#E9FFDB]/50 hover:text-[#E9FFDB] lg:flex"
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
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#E9FFDB] px-3 py-2.5 text-xs font-bold text-[#18181B] shadow-xs transition hover:bg-[#D7F9C2] ${
            collapsed && !mobile ? 'px-0' : ''
          }`}
        >
          <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
          {(!collapsed || mobile) && <span>Create Short Link</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Workspace navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
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
                  ? 'bg-[#3F3F46] text-[#E9FFDB]'
                  : 'text-zinc-300 hover:bg-[#3F3F46]/60 hover:text-white'
              } ${collapsed && !mobile ? 'justify-center px-2' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#E9FFDB]" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {(!collapsed || mobile) && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* QR Rescue Status Footer */}
      <div className="border-t border-[#3F3F46] p-3">
        {(!collapsed || mobile) && (
          <div className="mb-2.5 rounded-xl border border-[#3F3F46] bg-[#18181B]/70 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#E9FFDB]">
              <LifeBuoy className="h-3.5 w-3.5" />
              QR Rescue Active
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              Update target URLs anytime without reprinting physical QR codes.
            </p>
          </div>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-[#DC2626]/20 hover:text-red-300 ${
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
            title={collapsed && !mobile ? 'Sign in to save data' : undefined}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-[#3F3F46] hover:text-[#E9FFDB] ${
              collapsed && !mobile ? 'justify-center px-2' : ''
            }`}
          >
            <LogIn className="h-4 w-4 shrink-0" />
            {(!collapsed || mobile) && <span>Sign in to save data</span>}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F4F4F5] text-[#18181B] dark:bg-[#18181B] dark:text-[#F4F4F5]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-[#3F3F46] bg-[#27272A] transition-all duration-200 lg:block ${
          collapsed ? 'w-[72px]' : 'w-64'
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
            className="fixed inset-0 bg-[#18181B]/65 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 h-full w-64 border-r border-[#3F3F46] bg-[#27272A]">
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#E4E4E7] bg-white px-4 dark:border-[#3F3F46] dark:bg-[#27272A] sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg border border-[#E4E4E7] p-2 text-[#18181B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:text-white dark:hover:bg-[#3F3F46] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <form onSubmit={handleGlobalSearch} className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search links, slugs, or destinations..."
                className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] py-2 pl-9 pr-3 text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#27272A] focus:bg-white focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white dark:focus:border-[#E9FFDB]"
              />
            </form>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#3F3F46] dark:text-white"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {isAuthenticated ? (
              <NavLink
                to="/settings"
                className="flex items-center gap-2 rounded-full border border-[#E4E4E7] bg-[#F4F4F5] py-1 pl-1 pr-3 transition hover:border-[#27272A] dark:border-[#3F3F46] dark:bg-[#18181B]"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#27272A] text-xs font-bold text-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]">
                    {initials}
                  </span>
                )}
                <span className="hidden text-xs font-semibold text-[#18181B] dark:text-white sm:inline">
                  {user?.name ?? 'Account'}
                </span>
              </NavLink>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-1.5 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#3F3F46] dark:text-white"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="hidden items-center gap-1.5 rounded-xl bg-[#27272A] px-3 py-1.5 text-xs font-semibold text-[#E9FFDB] transition hover:bg-[#3F3F46] dark:bg-[#E9FFDB] dark:text-[#18181B] sm:inline-flex"
                >
                  Create Account
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

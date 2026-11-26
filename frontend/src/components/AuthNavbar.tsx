import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  BarChart3,
  LayoutDashboard,
  Link2,
  Menu,
  Moon,
  PlusCircle,
  QrCode,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/create', label: 'Create Link', icon: PlusCircle },
  { to: '/links', label: 'My Links', icon: Link2 },
  { to: '/qr-codes', label: 'QR Studio', icon: QrCode },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/manage', label: 'Management', icon: SlidersHorizontal },
];

export function AuthNavbar({ mode }: { mode?: 'login' | 'register' }) {
  const { theme, toggleTheme, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E4E4E7] bg-white/95 backdrop-blur-md dark:border-[#3F3F46] dark:bg-[#18181B]/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9FFDB] text-[#18181B] shadow-xs">
              <Link2 className="h-5 w-5 stroke-[2.4]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-[#18181B] dark:text-white">
                LINKORA
              </span>
              <span className="rounded bg-[#E9FFDB]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#16A34A] dark:text-[#E9FFDB]">
                PRO
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Quick page navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#27272A] text-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]'
                      : 'text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] dark:text-zinc-400 dark:hover:bg-[#27272A] dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#27272A] px-3.5 py-2 text-xs font-bold text-[#E9FFDB] transition hover:bg-[#3F3F46] dark:bg-[#E9FFDB] dark:text-[#18181B]"
            >
              <span>Dashboard</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to={mode === 'login' ? '/register' : '/login'}
                className="hidden rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white sm:inline-flex"
              >
                {mode === 'login' ? 'Create Account' : 'Log In'}
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#E9FFDB] px-3.5 py-2 text-xs font-bold text-[#18181B] shadow-xs transition hover:bg-[#D7F9C2]"
              >
                <span>Guest Dashboard →</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E4E4E7] p-2 text-[#18181B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#E4E4E7] bg-white px-4 py-3 dark:border-[#3F3F46] dark:bg-[#18181B] md:hidden">
          <div className="space-y-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#27272A] text-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]'
                      : 'text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] dark:text-zinc-400 dark:hover:bg-[#27272A] dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-3 flex gap-2 border-t border-[#E4E4E7] pt-3 dark:border-[#3F3F46]">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex-1 rounded-xl py-2 text-center text-xs font-bold transition ${
                mode === 'login'
                  ? 'bg-[#27272A] text-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]'
                  : 'border border-[#E4E4E7] text-[#18181B] dark:border-[#3F3F46] dark:text-white'
              }`}
            >
              Log In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex-1 rounded-xl py-2 text-center text-xs font-bold transition ${
                mode === 'register'
                  ? 'bg-[#27272A] text-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]'
                  : 'border border-[#E4E4E7] text-[#18181B] dark:border-[#3F3F46] dark:text-white'
              }`}
            >
              Create Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

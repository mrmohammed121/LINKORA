import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  LifeBuoy,
  Loader2,
  Moon,
  QrCode,
  ShieldCheck,
  Sun,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rescueSlug = searchParams.get('rescue');
  const redirectTarget = searchParams.get('redirect');

  const { token, theme, toggleTheme, login, register, isLoading, error, clearError } =
    useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    clearError();
  }, [mode, clearError]);

  useEffect(() => {
    if (token) {
      const target = rescueSlug
        ? `/?rescue=${encodeURIComponent(rescueSlug)}`
        : redirectTarget && redirectTarget.startsWith('/')
          ? redirectTarget
          : '/';
      navigate(target, { replace: true });
    }
  }, [token, rescueSlug, redirectTarget, navigate]);

  const handleFillDemo = () => {
    clearError();
    setEmail('demo@linkora.io');
    setPassword('Demo@1234');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch {
      // Error message is handled by Zustand store
    }
  };

  const querySuffix = rescueSlug
    ? `?rescue=${encodeURIComponent(rescueSlug)}`
    : redirectTarget
      ? `?redirect=${encodeURIComponent(redirectTarget)}`
      : '';

  const alternatePath =
    mode === 'login' ? `/register${querySuffix}` : `/login${querySuffix}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">LINKORA</span>
              <span className="ml-2 rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                QR Rescue
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <div className="my-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              <LifeBuoy className="h-3.5 w-3.5" />
              Never reprint a broken QR code again
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
              Dynamic QR Routing &{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent">
                Sub-10ms Telemetry
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Create short links, download print-ready PNG &amp; SVG QR codes, hot-swap
              destinations instantaneously with Redis cache invalidation, and track anonymized
              clicks asynchronously via BullMQ.
            </p>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <Zap className="mb-2 h-5 w-5 text-cyan-500" />
                <div className="text-sm font-semibold">Redis 302 Edge</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Instant redirects with no-store cache headers
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <LifeBuoy className="mb-2 h-5 w-5 text-amber-500" />
                <div className="text-sm font-semibold">QR Rescue</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Update URL or expiry while keeping the slug locked
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <Activity className="mb-2 h-5 w-5 text-indigo-500" />
                <div className="text-sm font-semibold">BullMQ Worker</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  SHA-256 anonymized IP &amp; device analytics
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 lg:pl-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              {rescueSlug && (
                <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <LifeBuoy className="h-4 w-4 shrink-0 text-amber-500" />
                  Sign in to rescue QR link <span className="font-mono font-bold">/{rescueSlug}</span>
                </div>
              )}

              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    Optional — Only needed to store data permanently
                  </span>
                  <Link
                    to="/"
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Continue without login →
                  </Link>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === 'login' ? 'Sign in to store your data' : 'Create an account to save data'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {mode === 'login'
                    ? 'Save your session links & QR codes permanently and access them from any device.'
                    : 'Your current session links will be automatically claimed and stored in your account.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={mode === 'register' ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter password'}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-500/20 dark:text-indigo-300"
                  >
                    Fill Demo Credentials (demo@linkora.io / Demo@1234)
                  </button>
                )}
              </form>

              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5 text-xs dark:border-slate-800">
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  JWT + RBAC Protected
                </span>

                <Link
                  to={alternatePath}
                  className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-500 dark:text-slate-500">
          LINKORA Platform — Fastify, Prisma (PostgreSQL), Upstash Redis &amp; BullMQ
        </footer>
      </div>
    </div>
  );
}

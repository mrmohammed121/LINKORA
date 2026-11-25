import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LifeBuoy,
  Loader2,
  Moon,
  QrCode,
  ShieldCheck,
  Sun,
  Zap,
} from 'lucide-react';
import authHeroIllustration from '../assets/auth-hero.svg';
import { GoogleContinueButton } from '../components/GoogleContinueButton';
import { WebsiteGuideAgent } from '../components/WebsiteGuideAgent';
import { useAuthStore } from '../store/useAuthStore';

interface AuthPageProps {
  mode: 'login' | 'register';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>(
    {}
  );
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
    setSubmitted(false);
    setTouched({});
    setGoogleError(null);
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

  const fieldErrors = useMemo(() => {
    const errs: { name?: string; email?: string; password?: string } = {};

    if (mode === 'register') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        errs.name = 'Full name is required.';
      } else if (trimmedName.length < 2) {
        errs.name = 'Name must be at least 2 characters.';
      }
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (mode === 'register' && password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }

    return errs;
  }, [mode, name, email, password]);

  const showNameError = (submitted || touched.name) && fieldErrors.name;
  const showEmailError = (submitted || touched.email) && fieldErrors.email;
  const showPasswordError = (submitted || touched.password) && fieldErrors.password;

  const handleFillDemo = () => {
    clearError();
    setGoogleError(null);
    setEmail('demo@linkora.io');
    setPassword('Demo@1234');
    setTouched({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setGoogleError(null);
    clearError();

    if (fieldErrors.name || fieldErrors.email || fieldErrors.password) {
      return;
    }

    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch {
      // Backend error message is captured in useAuthStore
    }
  };

  const querySuffix = rescueSlug
    ? `?rescue=${encodeURIComponent(rescueSlug)}`
    : redirectTarget
      ? `?redirect=${encodeURIComponent(redirectTarget)}`
      : '';

  const loginPath = `/login${querySuffix}`;
  const registerPath = `/register${querySuffix}`;
  const activeError = error || googleError;

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

        <div className="my-8 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Left Visual Showcase Column */}
          <div className="space-y-5 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              <LifeBuoy className="h-3.5 w-3.5" />
              Never reprint a broken QR code again
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Dynamic QR Routing &amp;{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent">
                Instant Link Rescue
              </span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
              Save short links permanently, style custom QR codes, hot-swap broken destinations in
              one click, and track scan telemetry in real time.
            </p>

            {/* Locally Bundled Responsive SVG Illustration */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-lg dark:border-slate-800">
              <img
                src={authHeroIllustration}
                alt="LINKORA Dynamic QR Rescue and Scan Telemetry overview"
                className="block h-auto w-full object-contain"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
                <Zap className="mb-1.5 h-4 w-4 text-cyan-500" />
                <div className="text-xs font-bold">Fast 302 Edge</div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Instant redirects with no-store headers
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
                <LifeBuoy className="mb-1.5 h-4 w-4 text-amber-500" />
                <div className="text-xs font-bold">QR Rescue</div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Update target URLs without reprinting
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
                <Activity className="mb-1.5 h-4 w-4 text-indigo-500" />
                <div className="text-xs font-bold">Scan Analytics</div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Anonymized device &amp; referrer stats
                </p>
              </div>
            </div>
          </div>

          {/* Right Auth Card Column */}
          <div className="lg:col-span-6 lg:pl-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              {rescueSlug && (
                <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <LifeBuoy className="h-4 w-4 shrink-0 text-amber-500" />
                  Sign in to rescue QR link <span className="font-mono font-bold">/{rescueSlug}</span>
                </div>
              )}

              {/* Mode Switcher Tabs + Continue Without Login */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="Authentication mode"
                  className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    onClick={() => {
                      if (mode !== 'login') navigate(loginPath, { replace: true });
                    }}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                      mode === 'login'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'register'}
                    onClick={() => {
                      if (mode !== 'register') navigate(registerPath, { replace: true });
                    }}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                      mode === 'register'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <Link
                  to="/"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Continue without login →
                </Link>
              </div>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === 'login' ? 'Sign in to store your data' : 'Create an account to save data'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {mode === 'login'
                    ? 'Save your session links & QR codes permanently and access them from any device.'
                    : 'Your current session links will be automatically claimed and stored in your account.'}
                </p>
              </div>

              <div className="mb-5">
                <GoogleContinueButton
                  onError={(msg) => setGoogleError(msg)}
                />
                <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <span>or continue with email</span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (error) clearError();
                      }}
                      placeholder="Alex Rivera"
                      className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
                        showNameError
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700'
                      }`}
                    />
                    {showNameError && (
                      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        {showNameError}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) clearError();
                    }}
                    placeholder="you@company.com"
                    className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
                      showEmailError
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700'
                    }`}
                  />
                  {showEmailError && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {showEmailError}
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Password
                    </label>
                    {mode === 'register' && (
                      <span
                        className={`text-[11px] font-medium ${
                          password.length >= 8
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {password.length}/8+ chars
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      value={password}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) clearError();
                      }}
                      placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter password'}
                      className={`w-full rounded-xl border bg-slate-50 py-3 pl-4 pr-11 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
                        showPasswordError
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {showPasswordError && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {showPasswordError}
                    </p>
                  )}
                </div>

                {activeError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <span>{activeError}</span>
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
                  to={mode === 'login' ? registerPath : loginPath}
                  className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {mode === 'login'
                    ? 'Need an account? Create one'
                    : 'Already have an account? Log in'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-500 dark:text-slate-500">
          LINKORA Platform — Fastify, Prisma, Redis Cache &amp; Dynamic QR Rescue
        </footer>
      </div>

      <WebsiteGuideAgent />
    </div>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  HelpCircle,
  LifeBuoy,
  Link2,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
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

  const { token, login, register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>(
    {}
  );
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  useEffect(() => {
    clearError();
    setSubmitted(false);
    setTouched({});
    setGoogleError(null);
    setShowForgotHelp(false);
  }, [mode, clearError]);

  useEffect(() => {
    if (token) {
      const target = rescueSlug
        ? `/dashboard?rescue=${encodeURIComponent(rescueSlug)}`
        : redirectTarget && redirectTarget.startsWith('/')
          ? redirectTarget
          : '/dashboard';
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
      // Backend error message captured in useAuthStore
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
    <div className="min-h-screen bg-[#F4F4F5] lg:grid lg:grid-cols-12">
      {/* Left Charcoal Visual Panel */}
      <aside className="flex flex-col justify-between bg-[#27272A] p-6 text-white sm:p-10 lg:col-span-5 lg:min-h-screen lg:p-12">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C4F000] text-[#18181B]">
              <Link2 className="h-5 w-5 stroke-[2.4]" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">LINKORA</span>
          </Link>

          <div className="mt-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3F3F46] bg-[#18181B]/70 px-3 py-1 text-xs font-semibold text-[#C4F000]">
              <LifeBuoy className="h-3.5 w-3.5" />
              Dynamic Links &amp; QR Rescue
            </span>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Control Every Short Link from One{' '}
              <span className="text-[#C4F000]">Command Center</span>.
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Sign in to store links permanently in Neon PostgreSQL, customize styled QR codes,
              update broken destinations live, and track real-time analytics.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-[#3F3F46] bg-[#18181B]/60 p-4">
              <Zap className="mt-0.5 h-5 w-5 shrink-0 text-[#C4F000]" />
              <div>
                <div className="text-sm font-bold text-white">Instant HTTP 302 Redirects</div>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Cache-backed routing with non-blocking click telemetry.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-[#3F3F46] bg-[#18181B]/60 p-4">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-[#C4F000]" />
              <div>
                <div className="text-sm font-bold text-white">Zero-Reprint QR Rescue</div>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Swap destinations or extend expiration on already-printed QR codes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-[#3F3F46] bg-[#18181B]/60 p-4">
              <Activity className="mt-0.5 h-5 w-5 shrink-0 text-[#C4F000]" />
              <div>
                <div className="text-sm font-bold text-white">Privacy-First Analytics</div>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Referrers, devices, regions, and SHA-256 daily IP hashing.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 hidden border-t border-[#3F3F46] pt-5 text-xs text-zinc-400 lg:block">
          Fastify 5 · Prisma 6.6 · Neon PostgreSQL · JWT Auth
        </div>
      </aside>

      {/* Right White Form Panel */}
      <main className="flex flex-col justify-center bg-white px-4 py-10 sm:px-8 lg:col-span-7 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {rescueSlug && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3.5 py-2.5 text-xs font-medium text-[#B45309]">
              <LifeBuoy className="h-4 w-4 shrink-0 text-[#F59E0B]" />
              Sign in to rescue QR link <span className="font-mono font-bold">/{rescueSlug}</span>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="inline-flex rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  if (mode !== 'login') navigate(loginPath, { replace: true });
                }}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  mode === 'login'
                    ? 'bg-[#27272A] text-[#C4F000]'
                    : 'text-[#71717A] hover:text-[#18181B]'
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
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  mode === 'register'
                    ? 'bg-[#27272A] text-[#C4F000]'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                Create Account
              </button>
            </div>

            <Link
              to="/dashboard"
              className="text-xs font-semibold text-[#71717A] hover:text-[#18181B] hover:underline"
            >
              Continue as guest →
            </Link>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-[#18181B]">
            {mode === 'login' ? 'Welcome back' : 'Create your LINKORA account'}
          </h2>
          <p className="mt-1 text-sm text-[#71717A]">
            {mode === 'login'
              ? 'Sign in to access your links, QR codes, and analytics.'
              : 'Temporary guest links in this browser are automatically saved to your account.'}
          </p>

          <div className="mt-6">
            <GoogleContinueButton onError={(msg) => setGoogleError(msg)} />
            <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
              <span className="h-px flex-1 bg-[#E4E4E7]" />
              <span>or continue with email</span>
              <span className="h-px flex-1 bg-[#E4E4E7]" />
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A]"
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
                  className={`w-full rounded-xl border bg-[#F4F4F5] px-4 py-3 text-sm text-[#18181B] focus:bg-white focus:outline-none ${
                    showNameError
                      ? 'border-[#DC2626]'
                      : 'border-[#E4E4E7] focus:border-[#27272A]'
                  }`}
                />
                {showNameError && (
                  <p className="mt-1 text-xs font-medium text-[#DC2626]">{showNameError}</p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A]"
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
                className={`w-full rounded-xl border bg-[#F4F4F5] px-4 py-3 text-sm text-[#18181B] focus:bg-white focus:outline-none ${
                  showEmailError
                    ? 'border-[#DC2626]'
                    : 'border-[#E4E4E7] focus:border-[#27272A]'
                }`}
              />
              {showEmailError && (
                <p className="mt-1 text-xs font-medium text-[#DC2626]">{showEmailError}</p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#71717A]"
                >
                  Password
                </label>
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => setShowForgotHelp((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#71717A] hover:text-[#18181B] hover:underline"
                  >
                    <HelpCircle className="h-3 w-3" />
                    Forgot password?
                  </button>
                ) : (
                  <span
                    className={`text-[11px] font-semibold ${
                      password.length >= 8 ? 'text-[#16A34A]' : 'text-[#71717A]'
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
                  className={`w-full rounded-xl border bg-[#F4F4F5] py-3 pl-4 pr-11 text-sm text-[#18181B] focus:bg-white focus:outline-none ${
                    showPasswordError
                      ? 'border-[#DC2626]'
                      : 'border-[#E4E4E7] focus:border-[#27272A]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#71717A] hover:bg-[#E4E4E7] hover:text-[#18181B]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {showPasswordError && (
                <p className="mt-1 text-xs font-medium text-[#DC2626]">{showPasswordError}</p>
              )}
            </div>

            {showForgotHelp && (
              <div className="rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-3 text-xs text-[#71717A]">
                <strong className="text-[#18181B]">Password recovery:</strong> Email password resets
                are not enabled in this workspace. Signed-in users can update their password anytime
                under <strong>Settings → Security</strong>, or sign in with Google / Demo Account.
              </div>
            )}

            {activeError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/10 px-4 py-3 text-xs font-medium text-[#DC2626]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{activeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C4F000] px-5 py-3 text-sm font-bold text-[#18181B] shadow-xs transition hover:bg-[#d2f833] disabled:opacity-60"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2.5 text-xs font-semibold text-[#18181B] transition hover:border-[#27272A] hover:bg-white"
              >
                Fill Demo Credentials (demo@linkora.io / Demo@1234)
              </button>
            )}
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E4E7] pt-5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[#71717A]">
              <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
              JWT + RBAC Protected
            </span>

            <Link
              to={mode === 'login' ? registerPath : loginPath}
              className="font-semibold text-[#18181B] underline decoration-[#C4F000] decoration-2 underline-offset-4"
            >
              {mode === 'login'
                ? 'Need an account? Create one'
                : 'Already have an account? Log in'}
            </Link>
          </div>
        </div>
      </main>

      <WebsiteGuideAgent />
    </div>
  );
}

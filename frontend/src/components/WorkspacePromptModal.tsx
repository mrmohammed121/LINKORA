import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LifeBuoy, Loader2, Lock, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface WorkspacePromptCardProps {
  featureName?: string;
  redirectTo?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function WorkspacePromptCard({
  featureName = 'your workspace overview',
  redirectTo = '/',
  onClose,
  onSuccess,
}: WorkspacePromptCardProps) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encodedRedirect = encodeURIComponent(redirectTo);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      await login('demo@linkora.io', 'Demo@1234');
      onSuccess?.();
      onClose?.();
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close prompt"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
        <Lock className="h-6 w-6" />
      </div>

      <h2 className="mt-4 text-center text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Sign in to access {featureName}
      </h2>
      <p className="mt-2 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Save temporary guest links permanently, hot-swap QR destinations with QR Rescue, and
        explore live click &amp; scan analytics.
      </p>

      <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50/75 p-3 text-xs text-teal-800 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-200">
        <div className="flex items-center gap-1.5 font-semibold">
          <LifeBuoy className="h-3.5 w-3.5 text-teal-600" />
          Guest links are automatically saved on login
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          onClick={() => void handleDemoLogin()}
          disabled={demoLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-60"
        >
          {demoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          1-Click Demo Login (demo@linkora.io)
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              navigate(`/login?redirect=${encodedRedirect}`);
            }}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Log In
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose?.();
              navigate(`/register?redirect=${encodedRedirect}`);
            }}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300"
          >
            Sign Up Free
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LifeBuoy, Loader2, Lock, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { GoogleContinueButton } from './GoogleContinueButton';

interface WorkspacePromptCardProps {
  featureName?: string;
  redirectTo?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function WorkspacePromptCard({
  featureName = 'your workspace overview',
  redirectTo = '/dashboard',
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
    <div className="relative w-full max-w-md rounded-3xl border border-[#E4E4E7] bg-white p-7 shadow-2xl dark:border-[#3F3F46] dark:bg-[#27272A]">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close prompt"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] dark:hover:bg-[#3F3F46] dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#27272A] text-[#C4F000] dark:bg-[#C4F000] dark:text-[#18181B]">
        <Lock className="h-6 w-6" />
      </div>

      <h2 className="mt-4 text-center text-xl font-extrabold tracking-tight text-[#18181B] dark:text-white">
        Sign in to access {featureName}
      </h2>
      <p className="mt-2 text-center text-xs leading-relaxed text-[#71717A] dark:text-zinc-300">
        Save temporary guest links permanently, hot-swap QR destinations with QR Rescue, and
        explore live click &amp; scan analytics.
      </p>

      <div className="mt-5 rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-3 text-xs text-[#18181B] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-zinc-200">
        <div className="flex items-center gap-1.5 font-semibold">
          <LifeBuoy className="h-3.5 w-3.5 text-[#16A34A]" />
          Guest links are automatically saved on login
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/10 px-3 py-2 text-xs font-medium text-[#DC2626]">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        <GoogleContinueButton
          onSuccess={() => {
            onSuccess?.();
            onClose?.();
          }}
        />

        <div className="flex items-center gap-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
          <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
          <span>or</span>
          <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
        </div>

        <button
          type="button"
          onClick={() => void handleDemoLogin()}
          disabled={demoLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C4F000] px-4 py-2.5 text-xs font-bold text-[#18181B] shadow-xs transition hover:bg-[#d2f833] disabled:opacity-60"
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
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2.5 text-xs font-semibold text-[#18181B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#3F3F46] dark:text-white"
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
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#27272A] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#3F3F46]"
          >
            Sign Up Free
          </button>
        </div>
      </div>
    </div>
  );
}

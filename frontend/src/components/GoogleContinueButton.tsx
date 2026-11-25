import { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface GoogleContinueButtonProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

export function GoogleContinueButton({ onSuccess, onError }: GoogleContinueButtonProps) {
  const { loginWithGoogle, isLoading } = useAuthStore();
  const [configError, setConfigError] = useState<string | null>(null);

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    setConfigError(null);
    if (!response.credential) {
      const msg = 'Google did not return a sign-in credential. Please try again.';
      setConfigError(msg);
      onError?.(msg);
      return;
    }

    try {
      await loginWithGoogle(response.credential);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setConfigError(msg);
      onError?.(msg);
    }
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            const msg =
              'Google OAuth is not configured yet. Set VITE_GOOGLE_CLIENT_ID in frontend/.env and GOOGLE_CLIENT_ID in backend/.env.';
            setConfigError(msg);
            onError?.(msg);
          }}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <GoogleMark />
          Continue with Google
        </button>
        {configError && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {configError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative flex min-h-[42px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">
        {isLoading ? (
          <div className="flex items-center gap-2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Signing in with Google...
          </div>
        ) : (
          <GoogleLogin
            onSuccess={(res) => void handleGoogleSuccess(res)}
            onError={() => {
              const msg = 'Google Sign-In failed or was cancelled.';
              setConfigError(msg);
              onError?.(msg);
            }}
            text="continue_with"
            shape="rectangular"
            size="large"
            width="360"
          />
        )}
      </div>
      {configError && (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {configError}
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

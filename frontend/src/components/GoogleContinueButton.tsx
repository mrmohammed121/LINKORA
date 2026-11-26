import { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface GoogleContinueButtonProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  className?: string;
}

export function GoogleContinueButton({
  onSuccess,
  onError,
  className = '',
}: GoogleContinueButtonProps) {
  const { loginWithGoogle, isLoading } = useAuthStore();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    setGoogleError(null);
    if (!response.credential) {
      const msg = 'Google did not return a sign-in credential. Please try again.';
      setGoogleError(msg);
      onError?.(msg);
      return;
    }

    try {
      await loginWithGoogle(response.credential);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed.';
      setGoogleError(msg);
      onError?.(msg);
    }
  };

  const handleGoogleError = () => {
    const msg =
      'Google Sign-In was cancelled or failed. Verify your Google account or authorized origin in Google Cloud.';
    setGoogleError(msg);
    onError?.(msg);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex w-full justify-center overflow-hidden rounded-xl border border-[#DADCE0] bg-white p-1 transition hover:shadow-xs">
        {isLoading ? (
          <div className="flex h-[40px] w-full items-center justify-center gap-2 text-xs font-semibold text-[#3C4043]">
            <Loader2 className="h-4 w-4 animate-spin text-[#1A73E8]" />
            <span>Signing in with Google...</span>
          </div>
        ) : (
          <GoogleLogin
            onSuccess={(res) => void handleGoogleSuccess(res)}
            onError={handleGoogleError}
            text="continue_with"
            shape="rectangular"
            size="large"
            theme="outline"
            width="384"
          />
        )}
      </div>

      {googleError && (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/10 p-3 text-xs text-[#DC2626]"
        >
          <div className="flex items-start gap-2 font-medium">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{googleError}</span>
          </div>

          <div className="rounded-lg bg-white/80 p-2.5 text-[11px] leading-relaxed text-[#3C4043] dark:bg-[#18181B] dark:text-zinc-300">
            <strong className="block text-[#18181B] dark:text-white">
              Resolving Google Authorization Error:
            </strong>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>
                <strong>Origin mismatch:</strong> Add{' '}
                <code className="rounded bg-black/5 px-1 py-0.5 font-mono font-bold text-[#1A73E8] dark:bg-white/10">
                  {typeof window !== 'undefined' ? window.location.origin : 'current URL'}
                </code>{' '}
                under <em>Authorized JavaScript origins</em> in Google Cloud Console credentials.
              </li>
              <li>
                <strong>Testing status:</strong> If your OAuth consent screen is in <em>Testing</em>{' '}
                mode, add your Google account to <em>Test users</em> or click <em>Publish App</em> in
                Google Cloud Console.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function GoogleLogo({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, LifeBuoy, Loader2, Lock, ShieldAlert, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useLinkStore } from '../store/useLinkStore';
import type { LinkItem, LinkStatus } from '../types';
import { WorkspacePromptCard } from './WorkspacePromptModal';

interface QrRescueModalProps {
  link: LinkItem | null;
  onClose: () => void;
  onSaved?: (updated: LinkItem) => void;
}

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function validateDestinationUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Destination URL is required.';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL must start with http:// or https://';
    }
    return null;
  } catch {
    return 'Enter a valid URL starting with https:// or http://';
  }
}

export function QrRescueModal({ link, onClose, onSaved }: QrRescueModalProps) {
  const isAuthenticated = Boolean(useAuthStore((s) => s.token));
  const updateLink = useLinkStore((s) => s.updateLink);
  const fetchLinks = useLinkStore((s) => s.fetchLinks);

  const [originalUrl, setOriginalUrl] = useState('');
  const [status, setStatus] = useState<LinkStatus>('ACTIVE');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => {
    if (!link) return;
    setOriginalUrl(link.originalUrl);
    setStatus(link.status);
    setExpiresAt(toLocalDatetimeValue(link.expiresAt));
    setError(null);
    setSavedToast(null);
  }, [link]);

  const liveUrlError = useMemo(() => {
    if (!originalUrl) return null;
    return validateDestinationUrl(originalUrl);
  }, [originalUrl]);

  if (!link) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
        <WorkspacePromptCard
          featureName={`Dynamic QR Rescue (/${link.slug})`}
          redirectTo="/qr-codes"
          onClose={onClose}
          onSuccess={() => {
            void fetchLinks();
          }}
        />
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateDestinationUrl(originalUrl);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const updated = await updateLink(link.id, {
        originalUrl: originalUrl.trim(),
        status,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setSavedToast(
        `QR Rescue complete! Existing printed QR code /${updated.slug} now redirects live to ${updated.originalUrl} without reprinting.`
      );
      onSaved?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update QR link');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  QR Rescue — Fix Broken QR Target
                </h3>
                {(link.rescueCount ?? 0) > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    {link.rescueCount} rescues
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hot-swap destination &amp; lifecycle with instant cache invalidation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3.5 text-xs text-indigo-800 dark:text-indigo-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <p className="font-medium leading-relaxed">
            <strong>Permanent QR Matrix:</strong> Your printed QR code stays identical while the
            target URL updates immediately.
          </p>
        </div>

        {savedToast && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <div className="flex-1">
              <p>{savedToast}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 font-bold text-emerald-700 underline dark:text-emerald-300"
              >
                Done &amp; close
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Locked Short Slug (Immutable)
            </label>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 font-mono text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <span className="truncate">{link.shortUrl}</span>
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Current Target URL:
            </span>{' '}
            <span className="break-all">{link.originalUrl}</span>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
              New Destination URL (http:// or https://)
            </label>
            <input
              type="url"
              required
              value={originalUrl}
              onChange={(e) => {
                setOriginalUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com/updated-destination"
              className={`w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
                liveUrlError
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:focus:border-indigo-400'
              }`}
            />
            {liveUrlError ? (
              <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                {liveUrlError}
              </p>
            ) : (
              originalUrl.trim() && (
                <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Valid target URL — ready for zero-downtime swap
                </p>
              )
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Link Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LinkStatus)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="ACTIVE">ACTIVE (Routing live)</option>
                <option value="EXPIRED">EXPIRED (Show rescue page)</option>
                <option value="DISABLED">DISABLED (Paused / not found)</option>
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Expiration Date
                </label>
                {expiresAt && (
                  <button
                    type="button"
                    onClick={() => setExpiresAt('')}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Clear expiry
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving || Boolean(liveUrlError)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save &amp; Rescue QR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

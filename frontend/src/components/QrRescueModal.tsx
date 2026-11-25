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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/75 p-4 backdrop-blur-xs">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-2xl dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#F59E0B]">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#18181B] dark:text-white">
                  Edit Link &amp; QR Rescue
                </h3>
                {(link.rescueCount ?? 0) > 0 && (
                  <span className="rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] font-bold text-[#B45309] dark:text-[#FBBF24]">
                    {link.rescueCount} rescues
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717A] dark:text-zinc-400">
                Hot-swap destination &amp; lifecycle with instant cache invalidation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#71717A] transition hover:bg-[#F4F4F5] hover:text-[#18181B] dark:hover:bg-[#3F3F46] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-3.5 text-xs text-[#18181B] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-zinc-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
          <p className="font-medium leading-relaxed">
            <strong>Permanent QR Matrix:</strong> Your printed QR code stays identical while the
            target URL updates immediately.
          </p>
        </div>

        {savedToast && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/10 p-3.5 text-xs font-medium text-[#16A34A]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p>{savedToast}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 font-bold underline"
              >
                Done &amp; close
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#71717A] dark:text-zinc-300">
              Locked Short Slug (Immutable)
            </label>
            <div className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-3.5 py-2.5 font-mono text-sm text-[#71717A] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-zinc-300">
              <span className="truncate">{link.shortUrl}</span>
              <Lock className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#71717A] dark:text-zinc-300">
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
              className={`w-full rounded-xl border bg-[#F4F4F5] px-3.5 py-2.5 text-sm text-[#18181B] focus:bg-white focus:outline-none dark:bg-[#18181B] dark:text-white ${
                liveUrlError
                  ? 'border-[#DC2626]'
                  : 'border-[#E4E4E7] focus:border-[#27272A] dark:border-[#3F3F46]'
              }`}
            />
            {liveUrlError ? (
              <p className="mt-1 text-[11px] font-medium text-[#DC2626]">{liveUrlError}</p>
            ) : (
              originalUrl.trim() && (
                <p className="mt-1 text-[11px] font-medium text-[#16A34A]">
                  Valid target URL — ready for zero-downtime swap
                </p>
              )
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#71717A] dark:text-zinc-300">
                Link Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LinkStatus)}
                className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-3.5 py-2.5 text-sm font-medium text-[#18181B] focus:border-[#27272A] focus:bg-white focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
              >
                <option value="ACTIVE">ACTIVE (Routing live)</option>
                <option value="EXPIRED">EXPIRED (Show rescue page)</option>
                <option value="DISABLED">DISABLED (Paused / not found)</option>
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-[#71717A] dark:text-zinc-300">
                  Expiration Date
                </label>
                {expiresAt && (
                  <button
                    type="button"
                    onClick={() => setExpiresAt('')}
                    className="text-[11px] font-semibold text-[#18181B] underline decoration-[#E9FFDB] dark:text-[#E9FFDB]"
                  >
                    Clear expiry
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-3 py-2.5 text-xs text-[#18181B] focus:border-[#27272A] focus:bg-white focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-3.5 py-2.5 text-xs font-medium text-[#DC2626]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E4E4E7] px-4 py-2.5 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:text-zinc-300 dark:hover:bg-[#3F3F46]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving || Boolean(liveUrlError)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E9FFDB] px-5 py-2.5 text-xs font-bold text-[#18181B] shadow-xs transition hover:bg-[#D7F9C2] disabled:opacity-60"
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

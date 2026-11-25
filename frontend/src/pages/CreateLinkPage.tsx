import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  QrCode,
  Share2,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { QrThumbnail } from '../components/QrThumbnail';
import { api, getDisplayBaseHost } from '../lib/api';
import { sanitizeSlugInput, validateSlugForSubmit } from '../lib/slug';
import { useLinkStore } from '../store/useLinkStore';
import type { LinkItem } from '../types';

export function CreateLinkPage() {
  const { links, createLink } = useLinkStore();

  const [originalUrl, setOriginalUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugNotice, setSlugNotice] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharedNotice, setSharedNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null);

  const handleSlugChange = (raw: string) => {
    const { slug, notice } = sanitizeSlugInput(raw);
    setCustomSlug(slug);
    setSlugNotice(notice);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const slugError = validateSlugForSubmit(customSlug.trim());
    if (slugError) {
      setError(slugError);
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createLink({
        originalUrl: originalUrl.trim(),
        customSlug: customSlug.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setCreatedLink(created);
      setShowQrPreview(false);
      setSharedNotice(null);
      setOriginalUrl('');
      setCustomSlug('');
      setSlugNotice(null);
      setExpiresAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create short link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleShare = async () => {
    if (!createdLink) return;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `LINKORA /${createdLink.slug}`,
          text: `Short link created with LINKORA`,
          url: createdLink.shortUrl,
        });
        setSharedNotice('Shared successfully.');
        setTimeout(() => setSharedNotice(null), 2000);
        return;
      } catch {
        // Fallback to clipboard copy if user dismissed or share unavailable
      }
    }
    await navigator.clipboard.writeText(createdLink.shortUrl);
    setSharedNotice('Share link copied to clipboard.');
    setTimeout(() => setSharedNotice(null), 2000);
  };

  const handleDownload = async (format: 'png' | 'svg') => {
    if (!createdLink) return;
    setDownloading(format);
    try {
      await api.qr.downloadFile(createdLink.id, createdLink.slug, format);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B] dark:text-white">
            Create Short Link
          </h1>
          <p className="mt-1 text-sm text-[#71717A] dark:text-zinc-400">
            Generate a fast short URL with an optional custom slug and expiration timer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A] lg:col-span-7"
          >
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                Original URL *
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="url"
                  required
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://your-website.com/landing-page"
                  className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] py-3 pl-10 pr-4 text-sm text-[#18181B] focus:border-[#27272A] focus:bg-white focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#71717A]">
                Only http:// and https:// URLs are accepted for security.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                Custom Slug (optional)
              </label>
              <div className="flex items-center rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] focus-within:border-[#27272A] focus-within:bg-white dark:border-[#3F3F46] dark:bg-[#18181B]">
                <span className="border-r border-[#E4E4E7] px-3.5 py-3 font-mono text-xs text-[#71717A] dark:border-[#3F3F46]">
                  {getDisplayBaseHost(createdLink?.shortUrl ?? links[0]?.shortUrl)}/
                </span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="spring-promo (auto 6 chars if empty)"
                  className="w-full bg-transparent px-3.5 py-3 font-mono text-sm text-[#18181B] placeholder:text-[#71717A] focus:outline-none dark:text-white"
                />
              </div>
              {slugNotice && (
                <p className="mt-1 text-[11px] font-medium text-[#F59E0B]">{slugNotice}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                Expiration Date &amp; Time (optional)
              </label>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] py-3 pl-10 pr-4 text-sm text-[#18181B] focus:border-[#27272A] focus:bg-white focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-3.5 text-xs text-[#18181B] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-zinc-200">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="h-4 w-4 text-[#16A34A]" />
                Instant Short URL Routing
              </div>
              <p className="mt-1 leading-relaxed text-[#71717A] dark:text-zinc-400">
                Your short link routes immediately with HTTP 302 redirects. Generate a QR code on
                demand from the result card or anytime in QR Code Studio.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-xs font-medium text-[#DC2626]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C4F000] px-5 py-3 text-sm font-bold text-[#18181B] shadow-xs transition hover:bg-[#d2f833] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Short Link...
                </>
              ) : (
                <>
                  Generate Short Link
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Right Result Panel */}
          <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A] lg:col-span-5">
            <h2 className="text-sm font-bold text-[#18181B] dark:text-white">
              Short Link Result
            </h2>

            {createdLink ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/10 px-3.5 py-2.5 text-xs font-semibold text-[#16A34A]">
                  Short link ready to share
                </div>

                <div className="rounded-xl border border-[#3F3F46] bg-[#27272A] p-4 text-white">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Generated Short URL
                  </div>
                  <a
                    href={createdLink.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 break-all font-mono text-sm font-bold text-[#C4F000] hover:underline"
                  >
                    {createdLink.shortUrl}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C4F000] px-3 py-2 text-xs font-bold text-[#18181B] transition hover:bg-[#d2f833]"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShare()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#3F3F46] bg-[#3F3F46]/60 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3F3F46]"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                  </div>

                  {sharedNotice && (
                    <p className="mt-2 text-[11px] font-medium text-[#C4F000]">{sharedNotice}</p>
                  )}
                </div>

                <div className="rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-3 text-xs dark:border-[#3F3F46] dark:bg-[#18181B]">
                  <div className="font-semibold text-[#71717A]">Destination</div>
                  <p className="mt-1 break-all font-medium text-[#18181B] dark:text-zinc-200">
                    {createdLink.originalUrl}
                  </p>
                  {createdLink.expiresAt && (
                    <p className="mt-2 text-[11px] text-[#71717A]">
                      Expires: {new Date(createdLink.expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* On-demand QR Preview */}
                {showQrPreview ? (
                  <div className="flex flex-col items-center rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-4 dark:border-[#3F3F46] dark:bg-[#18181B]">
                    <QrThumbnail
                      linkId={createdLink.id}
                      shortUrl={createdLink.shortUrl}
                      slug={createdLink.slug}
                      sizeClass="h-40 w-40"
                    />
                    <div className="mt-3 grid w-full grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownload('png')}
                        disabled={downloading !== null}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#E4E4E7]/50 dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white"
                      >
                        <Download className="h-3.5 w-3.5" /> PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownload('svg')}
                        disabled={downloading !== null}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#E4E4E7]/50 dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white"
                      >
                        <Download className="h-3.5 w-3.5" /> SVG
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowQrPreview(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2.5 text-xs font-bold text-[#18181B] transition hover:border-[#27272A] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
                  >
                    <QrCode className="h-4 w-4" />
                    Generate QR Code Preview
                  </button>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <Link
                    to="/links"
                    className="font-semibold text-[#71717A] hover:text-[#18181B] hover:underline dark:text-zinc-300"
                  >
                    View My Links
                  </Link>
                  <Link
                    to={`/analytics/${createdLink.id}`}
                    className="inline-flex items-center gap-1 font-bold text-[#18181B] underline decoration-[#C4F000] decoration-2 dark:text-white"
                  >
                    Open Analytics <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E4E4E7] py-14 text-center dark:border-[#3F3F46]">
                <Link2 className="h-11 w-11 text-[#71717A]/50" />
                <p className="mt-3 text-xs font-semibold text-[#18181B] dark:text-zinc-200">
                  Your short link will appear here
                </p>
                <p className="mt-1 max-w-[220px] text-[11px] text-[#71717A]">
                  Enter a destination URL and click Generate Short Link.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

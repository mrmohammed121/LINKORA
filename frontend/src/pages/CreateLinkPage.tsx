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
  const [copied, setCopied] = useState(false);
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
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create Short Link &amp; Dynamic QR
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Generate a permanent short URL and dynamic QR code whose destination can be edited
            anytime via QR Rescue.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Destination URL *
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  required
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://your-website.com/landing-page"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Only http:// and https:// URLs are accepted for security.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Custom Back-Half / Slug (optional)
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white dark:border-slate-700 dark:bg-slate-950">
                <span className="border-r border-slate-200 px-3.5 py-3 font-mono text-xs text-slate-500 dark:border-slate-700">
                  {getDisplayBaseHost(createdLink?.shortUrl ?? links[0]?.shortUrl)}/
                </span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="spring-promo (auto 6 chars if empty)"
                  className="w-full bg-transparent px-3.5 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
              </div>
              {slugNotice && (
                <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  {slugNotice}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Expiration Date &amp; Time (optional)
              </label>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs text-teal-800 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="h-4 w-4 text-teal-600" />
                Permanent Dynamic QR Routing
              </div>
              <p className="mt-1 leading-relaxed">
                Generated QR codes point to your short URL, never directly to the long URL—so you
                can swap destinations or reactivate expired links anytime.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Link &amp; QR...
                </>
              ) : (
                <>
                  Create Short Link &amp; QR Code
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Right Preview Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Live QR &amp; Short URL Preview
            </h2>

            {createdLink ? (
              <div className="mt-4 flex flex-col items-center text-center">
                <QrThumbnail linkId={createdLink.id} sizeClass="h-44 w-44" />

                <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <a
                    href={createdLink.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 truncate font-mono text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {createdLink.shortUrl}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="mt-4 grid w-full grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownload('png')}
                    disabled={downloading !== null}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownload('svg')}
                    disabled={downloading !== null}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    SVG
                  </button>
                </div>

                <Link
                  to={`/analytics/${createdLink.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Open Link Analytics <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-700">
                <QrCode className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Your dynamic QR code will appear here
                </p>
                <p className="mt-1 max-w-[220px] text-[11px] text-slate-400">
                  Submit the form to generate a short link and downloadable PNG/SVG QR matrix.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  LifeBuoy,
  Link2,
  Loader2,
  Lock,
  QrCode,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { api, getDisplayBaseHost } from '../lib/api';
import { getGuestLinks, saveGuestLink } from '../lib/guestStorage';
import { sanitizeSlugInput, validateSlugForSubmit } from '../lib/slug';
import type { LinkItem } from '../types';

export function PublicLandingPage() {
  const [createMode, setCreateMode] = useState<'link' | 'qr'>('link');
  const [originalUrl, setOriginalUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugNotice, setSlugNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guestLinks, setGuestLinks] = useState<LinkItem[]>(() => getGuestLinks());
  const [activeGuest, setActiveGuest] = useState<LinkItem | null>(
    () => getGuestLinks()[0] ?? null
  );
  const [showGuestQr, setShowGuestQr] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!activeGuest || !showGuestQr) {
      setQrSvg(null);
      setQrLoading(false);
      return;
    }
    let cancelled = false;
    setQrLoading(true);
    api.qr
      .fetchGuestSvgMarkup(activeGuest.slug)
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setQrSvg(null);
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeGuest, showGuestQr]);

  const handleSlugChange = (raw: string) => {
    const { slug, notice } = sanitizeSlugInput(raw);
    setCustomSlug(slug);
    setSlugNotice(notice);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!originalUrl.trim()) return;

    const slugError = validateSlugForSubmit(customSlug.trim());
    if (slugError) {
      setError(slugError);
      return;
    }

    setIsSubmitting(true);
    try {
      const { link } = await api.links.createGuest({
        originalUrl: originalUrl.trim(),
        customSlug: customSlug.trim() || undefined,
      });
      saveGuestLink(link);
      setGuestLinks(getGuestLinks());
      setActiveGuest(link);
      setShowGuestQr(createMode === 'qr');
      setOriginalUrl('');
      setCustomSlug('');
      setSlugNotice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate temporary short link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async (link: LinkItem) => {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopiedSlug(link.slug);
    setTimeout(() => setCopiedSlug(null), 1600);
  };

  const handleDownload = async (format: 'png' | 'svg') => {
    if (!activeGuest) return;
    setDownloading(format);
    try {
      await api.qr.downloadGuestFile(activeGuest.slug, format);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Public Try-It-Now Hero Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
              <Sparkles className="h-3.5 w-3.5" />
              Try LINKORA Free — No Account Required
            </div>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Create a Short Link &amp; Dynamic QR Code
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Test instant link shortening and scannable QR generation right now. Sign in anytime
              to claim links permanently and unlock QR Rescue &amp; analytics.
            </p>

            {/* Pill Switcher */}
            <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setCreateMode('link')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  createMode === 'link'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Short link
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('qr')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  createMode === 'qr'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                QR Code
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <div className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="url"
                    required
                    value={originalUrl}
                    onChange={(e) => setOriginalUrl(e.target.value)}
                    placeholder="Paste your long URL (https://example.com/product-launch)..."
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {getDisplayBaseHost(activeGuest?.shortUrl)} /
                  </span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="custom-slug (optional)"
                    className="w-48 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {createMode === 'qr' ? 'Generate Free QR Code' : 'Shorten Free Link'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Guest links stay active for 24 hours — log in anytime to save permanently.
                </span>
              </div>
            </form>

            {slugNotice && (
              <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                {slugNotice}
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Live Guest Result + Save-to-Dashboard CTA */}
        {activeGuest && (
          <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-500/30 dark:bg-slate-900">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
              {showGuestQr && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950 lg:col-span-4">
                  {qrLoading ? (
                    <div className="flex h-44 w-44 items-center justify-center">
                      <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    </div>
                  ) : qrSvg ? (
                    <div
                      className="h-44 w-44 overflow-hidden rounded-xl bg-white p-2 shadow-xs [&>svg]:h-full [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  ) : (
                    <div className="flex h-44 w-44 items-center justify-center text-xs text-slate-400">
                      QR Preview Unavailable
                    </div>
                  )}

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
                </div>
              )}

              <div className={`space-y-4 ${showGuestQr ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <Clock className="h-3 w-3" />
                    24h Guest Preview
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {showGuestQr ? 'Live & Scannable Now' : 'Live Short Link Ready'}
                  </span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={activeGuest.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-lg font-extrabold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {activeGuest.shortUrl}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCopy(activeGuest)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {copiedSlug === activeGuest.slug ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>
                    {!showGuestQr && (
                      <button
                        type="button"
                        onClick={() => setShowGuestQr(true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Generate QR Code
                      </button>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    Redirects to: {activeGuest.originalUrl}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <div className="flex items-start gap-3">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Want to keep this QR code permanently &amp; track scans?
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Your temporary link is stored in this browser. Sign in or create a free
                        account to claim it automatically, remove the 24-hour expiration, edit
                        destinations with QR Rescue, and view Recharts analytics.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          to="/login"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                        >
                          Save to Dashboard &amp; Unlock QR Rescue / Analytics (Log In Required)
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {guestLinks.length > 1 && (
                  <div className="pt-1">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Recent Guest Links in Session ({guestLinks.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {guestLinks.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => {
                            setActiveGuest(item);
                            setShowGuestQr(createMode === 'qr');
                          }}
                          className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition ${
                            activeGuest.slug === item.slug
                              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          /{item.slug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Feature Overview Cards */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <Zap className="h-6 w-6 text-blue-600" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              Sub-5ms Edge Redirects
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              In-memory cache lookup with HTTP 302 and no-store headers so destination updates take
              effect immediately.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <LifeBuoy className="h-6 w-6 text-amber-500" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              Dynamic QR Rescue
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Change destination URLs or reactivate expired QR codes anytime without reprinting
              physical flyers or packaging.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <Activity className="h-6 w-6 text-teal-600" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              Privacy-First Analytics
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Asynchronous click tracking with SHA-256 hashed IPs, device classification, referrer
              stats, and Recharts dashboards.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

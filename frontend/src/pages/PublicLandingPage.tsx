import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  Copy,
  Download,
  ExternalLink,
  Layers,
  LifeBuoy,
  Link2,
  Loader2,
  Mail,
  Menu,
  QrCode,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  X,
  Zap,
} from 'lucide-react';
import Crosshair from '../components/Crosshair';
import CursorGrid from '../components/CursorGrid';
import TechText from '../components/TechText';
import { WebsiteGuideAgent } from '../components/WebsiteGuideAgent';
import { api, getDisplayBaseHost } from '../lib/api';
import { getGuestLinks, saveGuestLink } from '../lib/guestStorage';
import { sanitizeSlugInput, validateSlugForSubmit } from '../lib/slug';
import { useAuthStore } from '../store/useAuthStore';
import type { LinkItem } from '../types';

const FEATURE_CARDS = [
  {
    title: 'Smart URL Shortening',
    description:
      'Turn long campaign links into crisp, reliable short URLs backed by cache-first HTTP 302 routing and strict http/https validation.',
    icon: Link2,
    route: '/create',
  },
  {
    title: 'Custom Slugs',
    description:
      'Claim memorable back-half slugs for products, flyers, or social bios with real-time sanitization and conflict protection.',
    icon: Tag,
    route: '/create',
  },
  {
    title: 'QR Code Generation',
    description:
      'Generate crisp PNG & SVG QR codes on demand with custom dot shapes, colors, branded frames, and scannability checks.',
    icon: QrCode,
    route: '/qr-codes',
  },
  {
    title: 'Click Analytics',
    description:
      'Monitor hourly & daily click trends, top referrers, device breakdowns, and regions with daily SHA-256 IP anonymisation.',
    icon: BarChart3,
    route: '/analytics',
  },
  {
    title: 'Link Expiration',
    description:
      'Schedule automatic expiry timestamps for time-boxed promotions and route expired scans cleanly to QR Rescue.',
    icon: CalendarClock,
    route: '/manage',
  },
  {
    title: 'Link Management',
    description:
      'Search, filter, pause, reactivate, hot-swap destinations with QR Rescue, or delete links from one unified console.',
    icon: SlidersHorizontal,
    route: '/links',
  },
];

export function PublicLandingPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const heroRef = useRef<HTMLElement | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      setError(err instanceof Error ? err.message : 'Unable to generate short link');
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
    <div id="top" className="min-h-screen bg-[#F4F4F5] text-[#18181B]">
      {/* Charcoal Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[#3F3F46] bg-[#27272A]/95 text-white backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9FFDB] text-[#18181B]">
              <Link2 className="h-5 w-5 stroke-[2.4]" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">LINKORA</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-300 md:flex">
            <a href="#top" className="transition hover:text-[#E9FFDB]">
              Home
            </a>
            <a href="#features" className="transition hover:text-[#E9FFDB]">
              Features
            </a>
            <a href="#about" className="transition hover:text-[#E9FFDB]">
              About
            </a>
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            {token ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E9FFDB] px-4 py-2 text-xs font-bold text-[#18181B] transition hover:bg-[#D7F9C2]"
              >
                Open Dashboard{user?.name ? ` (${user.name.split(' ')[0]})` : ''}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl border border-[#3F3F46] px-4 py-2 text-xs font-semibold text-white transition hover:border-zinc-400 hover:bg-[#3F3F46]"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-[#E9FFDB] px-4 py-2 text-xs font-bold text-[#18181B] transition hover:bg-[#D7F9C2]"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="rounded-lg border border-[#3F3F46] p-2 text-zinc-200 hover:bg-[#3F3F46] md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#3F3F46] bg-[#27272A] px-4 py-4 md:hidden">
            <div className="flex flex-col space-y-3 text-sm font-medium text-zinc-200">
              <a href="#top" onClick={() => setMobileMenuOpen(false)}>
                Home
              </a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>
                About
              </a>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {token ? (
                  <Link
                    to="/dashboard"
                    className="col-span-2 rounded-xl bg-[#E9FFDB] py-2.5 text-center text-xs font-bold text-[#18181B]"
                  >
                    Open Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="rounded-xl border border-[#3F3F46] py-2.5 text-center text-xs font-semibold text-white"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="rounded-xl bg-[#E9FFDB] py-2.5 text-center text-xs font-bold text-[#18181B]"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Charcoal Hero Section */}
      <section
        ref={heroRef}
        className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden border-b border-[#3F3F46] bg-[#27272A] px-4 py-24 text-white sm:px-6 lg:px-8 lg:py-32"
      >
        <CursorGrid
          className="!absolute inset-0 z-0"
          cellSize={56}
          color="#E9FFDB"
          gridColor="#E9FFDB"
          radius={160}
          gridOpacity={0.08}
          fillOpacity={0.07}
          maxOpacity={0.55}
          spotlight={0.6}
          ambient={0.2}
          clickPulse
          intro
        />
        <Crosshair
          containerRef={heroRef}
          color="#E9FFDB"
          opacity={0.28}
          fade={0.4}
          targetEffect="lock"
          showCoordinates
          clickPulse
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="sr-only">LINKORA</h1>
            <div className="mx-auto h-40 w-full sm:h-52 lg:h-64">
              <TechText
                text="LINKORA"
                fontFamily='"BBH Bogle", sans-serif'
                fontWeight={400}
                fontSize={180}
                letterSpacing={0.02}
                color="#E9FFDB"
                accentColor="#E9FFDB"
                align="center"
                reveal="letter"
                selection
                labels
                draggable
                sweep
                clickKick
                intro="assemble"
                introDuration={1.8}
              />
            </div>

            <p className="mt-1 flex items-center justify-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.28em] text-zinc-300 sm:gap-4 sm:text-sm">
              <span>Paste</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#E9FFDB]" aria-hidden="true" />
              <span>Generate</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#E9FFDB]" aria-hidden="true" />
              <span>Track</span>
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:mt-10">
              <Link
                to={token ? '/dashboard' : '/dashboard'}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E9FFDB] px-6 py-3.5 text-sm font-bold text-[#18181B] shadow-sm transition hover:bg-[#D7F9C2]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-[#3F3F46] bg-[#3F3F46]/40 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-zinc-400 hover:bg-[#3F3F46]"
              >
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Next Section: Interactive Product Dashboard Preview (Real Backend Components) */}
      <section
        id="preview"
        className="border-b border-[#E4E4E7] bg-[#F4F4F5] px-4 py-16 dark:border-[#3F3F46] dark:bg-[#18181B] sm:px-6 lg:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl rounded-3xl border border-[#3F3F46] bg-[#27272A] p-3 text-white shadow-2xl sm:p-5">
            {/* Window Chrome */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#3F3F46] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3F3F46]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#3F3F46]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E9FFDB]" />
                <span className="ml-2 font-mono text-[11px] text-zinc-400">
                  Live Workspace Preview · Try creating a real link right here
                </span>
              </div>

              <div className="inline-flex items-center gap-1 rounded-xl border border-[#3F3F46] bg-[#27272A] p-1">
                <button
                  type="button"
                  onClick={() => setCreateMode('link')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    createMode === 'link'
                      ? 'bg-[#E9FFDB] text-[#18181B]'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Short link
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('qr')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    createMode === 'qr'
                      ? 'bg-[#E9FFDB] text-[#18181B]'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR Code
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Real Interactive Shortener Card */}
              <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 text-[#18181B] lg:col-span-8">
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                      Destination URL
                    </label>
                    <div className="flex items-center gap-2.5 rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-3.5 py-2.5 focus-within:border-[#27272A] focus-within:bg-white">
                      <Link2 className="h-4 w-4 shrink-0 text-[#71717A]" />
                      <input
                        type="url"
                        required
                        value={originalUrl}
                        onChange={(e) => setOriginalUrl(e.target.value)}
                        placeholder="https://your-product.com/spring-launch?utm_source=demo"
                        className="w-full bg-transparent text-sm text-[#18181B] placeholder:text-[#71717A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 items-center rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] focus-within:border-[#27272A] focus-within:bg-white">
                      <span className="border-r border-[#E4E4E7] px-3 py-2 font-mono text-xs text-[#71717A]">
                        {getDisplayBaseHost(activeGuest?.shortUrl)}/
                      </span>
                      <input
                        type="text"
                        value={customSlug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="custom-slug (optional)"
                        className="w-full bg-transparent px-3 py-2 font-mono text-xs text-[#18181B] placeholder:text-[#71717A] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#27272A] px-5 py-2.5 text-xs font-bold text-[#E9FFDB] transition hover:bg-[#3F3F46] disabled:opacity-60"
                    >
                      {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {createMode === 'qr' ? 'Generate QR Code' : 'Generate Short Link'}
                    </button>
                  </div>
                </form>

                {slugNotice && (
                  <p className="mt-2 text-[11px] font-medium text-[#F59E0B]">{slugNotice}</p>
                )}

                {error && (
                  <div className="mt-3 rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/10 px-3 py-2 text-xs font-medium text-[#DC2626]">
                    {error}
                  </div>
                )}

                {activeGuest ? (
                  <div className="mt-4 rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-4">
                    <div
                      className={`grid grid-cols-1 gap-4 ${showGuestQr ? 'sm:grid-cols-12' : ''}`}
                    >
                      {showGuestQr && (
                        <div className="flex flex-col items-center rounded-xl border border-[#E4E4E7] bg-white p-3 sm:col-span-4">
                          {qrLoading ? (
                            <div className="flex h-28 w-28 items-center justify-center">
                              <Loader2 className="h-5 w-5 animate-spin text-[#27272A]" />
                            </div>
                          ) : qrSvg ? (
                            <div
                              className="h-28 w-28 [&>svg]:h-full [&>svg]:w-full"
                              dangerouslySetInnerHTML={{ __html: qrSvg }}
                            />
                          ) : (
                            <div className="flex h-28 w-28 items-center justify-center text-[11px] text-[#71717A]">
                              QR Unavailable
                            </div>
                          )}
                          <div className="mt-2 grid w-full grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleDownload('png')}
                              disabled={downloading !== null}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] py-1 text-[11px] font-semibold text-[#18181B] hover:bg-[#E4E4E7]"
                            >
                              <Download className="h-3 w-3" /> PNG
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownload('svg')}
                              disabled={downloading !== null}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] py-1 text-[11px] font-semibold text-[#18181B] hover:bg-[#E4E4E7]"
                            >
                              <Download className="h-3 w-3" /> SVG
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={showGuestQr ? 'sm:col-span-8' : ''}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#16A34A]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#16A34A]">
                            Live · 24h Guest Preview
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <a
                            href={activeGuest.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 truncate font-mono text-sm font-bold text-[#18181B] underline decoration-[#E9FFDB] decoration-2 underline-offset-4"
                          >
                            {activeGuest.shortUrl}
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleCopy(activeGuest)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E4E4E7] bg-white px-2.5 py-1 text-xs font-semibold text-[#18181B] hover:bg-[#E4E4E7]/50"
                          >
                            {copiedSlug === activeGuest.slug ? (
                              <>
                                <Check className="h-3 w-3 text-[#16A34A]" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy
                              </>
                            )}
                          </button>
                          {!showGuestQr && (
                            <button
                              type="button"
                              onClick={() => setShowGuestQr(true)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#27272A] px-2.5 py-1 text-xs font-semibold text-[#E9FFDB] hover:bg-[#3F3F46]"
                            >
                              <QrCode className="h-3 w-3" /> Generate QR
                            </button>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-[#71717A]">
                          Redirects to: {activeGuest.originalUrl}
                        </p>

                        {guestLinks.length > 1 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {guestLinks.slice(0, 5).map((item) => (
                              <button
                                key={item.slug}
                                type="button"
                                onClick={() => {
                                  setActiveGuest(item);
                                  setShowGuestQr(createMode === 'qr');
                                }}
                                className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                                  activeGuest.slug === item.slug
                                    ? 'border-[#27272A] bg-[#27272A] text-[#E9FFDB]'
                                    : 'border-[#E4E4E7] bg-white text-[#71717A]'
                                }`}
                              >
                                /{item.slug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-[#E4E4E7] bg-[#F4F4F5] px-4 py-3 text-xs text-[#71717A]">
                    <span>Paste any URL above to test live shortening against Neon PostgreSQL.</span>
                    <span className="font-mono font-semibold text-[#18181B]">HTTP 302</span>
                  </div>
                )}
              </div>

              {/* Right Architecture / Live Metrics Snapshot Card */}
              <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#3F3F46] bg-[#27272A] p-5 lg:col-span-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Platform Capabilities
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div className="rounded-xl border border-[#3F3F46] bg-[#18181B]/70 p-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Redirect Protocol</span>
                        <Zap className="h-3.5 w-3.5 text-[#E9FFDB]" />
                      </div>
                      <div className="mt-1 font-mono text-base font-extrabold text-[#E9FFDB]">
                        HTTP 302 + Cache
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#3F3F46] bg-[#18181B]/70 p-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Dynamic QR Rescue</span>
                        <LifeBuoy className="h-3.5 w-3.5 text-[#E9FFDB]" />
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">
                        Swap URLs Without Reprinting
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#3F3F46] bg-[#18181B]/70 p-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Visitor Privacy</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-[#E9FFDB]" />
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">
                        SHA-256 Daily IP Hashing
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  to="/dashboard"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E9FFDB] px-4 py-2.5 text-xs font-bold text-[#18181B] transition hover:bg-[#D7F9C2]"
                >
                  Open Full Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#27272A] px-3 py-1 text-xs font-bold text-[#E9FFDB]">
            <Layers className="h-3.5 w-3.5" />
            Complete Toolkit
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#18181B] sm:text-4xl">
            Built for Speed, Control &amp; Actionable Telemetry
          </h2>
          <p className="mt-2.5 text-sm text-[#71717A] sm:text-base">
            Every workflow you need to shorten links, style QR assets, manage expiration, and
            analyze traffic cleanly.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.route}
                className="group rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-[#27272A]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#27272A] text-[#E9FFDB] transition group-hover:bg-[#E9FFDB] group-hover:text-[#18181B]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#18181B]">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#71717A]">
                  {feature.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="border-y border-[#E4E4E7] bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              About LINKORA
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#18181B] sm:text-3xl">
              Engineered for Reliability from Printed QR Codes to Cloud Databases
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A] sm:text-base">
              LINKORA separates the permanent short slug from the destination URL. Built on Fastify
              5, Prisma 6.6, and Neon Serverless PostgreSQL, redirects run cache-first while click
              events are persisted asynchronously—keeping redirects fast and QR campaigns editable
              forever.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-5">
            <div className="rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-5">
              <Activity className="h-5 w-5 text-[#18181B]" />
              <div className="mt-3 text-xl font-extrabold text-[#18181B]">Async</div>
              <div className="mt-0.5 text-xs text-[#71717A]">Non-blocking click telemetry</div>
            </div>
            <div className="rounded-2xl bg-[#27272A] p-5 text-white">
              <LifeBuoy className="h-5 w-5 text-[#E9FFDB]" />
              <div className="mt-3 text-xl font-extrabold text-[#E9FFDB]">Zero Reprint</div>
              <div className="mt-0.5 text-xs text-zinc-300">Live QR Rescue updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA Section */}
      <section id="contact" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#27272A] p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E9FFDB]">
              <Mail className="h-4 w-4" />
              Get in Touch &amp; Start Building
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Ready to launch your next short-link campaign?
            </h2>
            <p className="mt-1.5 text-sm text-zinc-300">
              Test instantly in guest mode, sign in with demo credentials, or ask our built-in
              LINKORA Guide Agent anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-[#E9FFDB] px-5 py-3 text-xs font-bold text-[#18181B] transition hover:bg-[#D7F9C2]"
            >
              Create Free Account
            </Link>
            <Link
              to="/dashboard"
              className="rounded-xl border border-[#3F3F46] bg-[#3F3F46]/60 px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#3F3F46]"
            >
              Launch Workspace
            </Link>
          </div>
        </div>
      </section>

      <WebsiteGuideAgent />
    </div>
  );
}

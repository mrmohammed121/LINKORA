import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Laptop,
  Link2,
  Loader2,
  MousePointerClick,
  Plus,
  QrCode,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppLayout } from '../components/AppLayout';
import Crosshair from '../components/Crosshair';
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { StatusBadge } from '../components/StatusBadge';
import { api, getDisplayBaseHost } from '../lib/api';
import { sanitizeSlugInput, validateSlugForSubmit } from '../lib/slug';
import { useAuthStore } from '../store/useAuthStore';
import { useLinkStore } from '../store/useLinkStore';
import type { LinkItem, OverviewAnalyticsResponse } from '../types';

type DatePreset = '7d' | '30d' | '90d' | 'all';

function getFromIso(preset: DatePreset): string | undefined {
  if (preset === 'all') return undefined;
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rescueSlugParam = searchParams.get('rescue');
  const handledRescueRef = useRef<string | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const theme = useAuthStore((s) => s.theme);
  const claimNotice = useAuthStore((s) => s.claimNotice);
  const clearClaimNotice = useAuthStore((s) => s.clearClaimNotice);
  const { links, isLoading: linksLoading, fetchLinks, createLink } = useLinkStore();
  const [dismissGuestNotice, setDismissGuestNotice] = useState(false);

  const [createMode, setCreateMode] = useState<'link' | 'qr'>('link');
  const [originalUrl, setOriginalUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugNotice, setSlugNotice] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DatePreset>('30d');
  const [overview, setOverview] = useState<OverviewAnalyticsResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [recentCreatedLink, setRecentCreatedLink] = useState<LinkItem | null>(null);
  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [rescueModalLink, setRescueModalLink] = useState<LinkItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rescueNotice, setRescueNotice] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await api.analytics.overview({
        granularity: 'day',
        from: getFromIso(preset),
      });
      setOverview(res);
    } catch {
      // ignore transient error
    } finally {
      setOverviewLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!rescueSlugParam || linksLoading || links.length === 0) return;
    if (handledRescueRef.current === rescueSlugParam) return;

    const match = links.find((l) => l.slug.toLowerCase() === rescueSlugParam.toLowerCase());
    handledRescueRef.current = rescueSlugParam;

    if (match) {
      setRescueModalLink(match);
      setRescueNotice(null);
    } else {
      setRescueNotice(
        token
          ? `No link with slug "/${rescueSlugParam}" was found under your account permissions.`
          : `No link with slug "/${rescueSlugParam}" was found in this browser session. Sign in if it belongs to your account.`
      );
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('rescue');
    setSearchParams(nextParams, { replace: true });
  }, [rescueSlugParam, linksLoading, links, searchParams, setSearchParams, token]);

  const handleSlugChange = (raw: string) => {
    const { slug, notice } = sanitizeSlugInput(raw);
    setCustomSlug(slug);
    setSlugNotice(notice);
    setCreateError(null);
  };

  const handleQuickCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!originalUrl.trim()) return;

    const slugError = validateSlugForSubmit(customSlug.trim());
    if (slugError) {
      setCreateError(slugError);
      return;
    }

    setIsCreating(true);
    try {
      const created = await createLink({
        originalUrl: originalUrl.trim(),
        customSlug: customSlug.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setOriginalUrl('');
      setCustomSlug('');
      setSlugNotice(null);
      setExpiresAt('');
      if (createMode === 'qr') {
        setRecentCreatedLink(null);
        setQrModalLink(created);
      } else {
        setRecentCreatedLink(created);
      }
      void loadOverview();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (id: string, shortUrl: string) => {
    await navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const summary = useMemo(() => {
    if (overview) return overview.summary;
    return {
      totalLinks: links.length,
      activeLinks: links.filter((l) => l.status === 'ACTIVE').length,
      expiredLinks: links.filter((l) => l.status === 'EXPIRED').length,
      disabledLinks: links.filter((l) => l.status === 'DISABLED').length,
      totalClicks: links.reduce((sum, l) => sum + l.clickCount, 0),
      uniqueVisitors: 0,
    };
  }, [overview, links]);

  const devices = overview?.devices ?? [];
  const referrers = overview?.referrers ?? [];
  const totalDeviceClicks = devices.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        {claimNotice && (
          <div className="flex items-center justify-between rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3 text-xs font-semibold text-[#16A34A]">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {claimNotice}
            </span>
            <button type="button" onClick={clearClaimNotice} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {!token && links.length > 0 && !dismissGuestNotice && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 text-xs text-[#18181B] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-zinc-200">
            <span>
              <strong>Guest session:</strong> Your {links.length} link
              {links.length === 1 ? '' : 's'} remain active for 24 hours in this browser. Sign in
              to store them permanently.
            </span>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-lg bg-[#C4F000] px-3 py-1.5 font-bold text-[#18181B] transition hover:bg-[#d2f833]"
              >
                Save to Account
              </Link>
              <button
                type="button"
                onClick={() => setDismissGuestNotice(true)}
                className="font-semibold text-[#71717A] underline hover:text-[#18181B] dark:text-zinc-400"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {rescueNotice && (
          <div className="flex items-center justify-between rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-xs font-medium text-[#B45309] dark:text-[#FBBF24]">
            <span>{rescueNotice}</span>
            <button type="button" onClick={() => setRescueNotice(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Charcoal Welcome + Quick-Create Hero Card */}
        <section
          ref={heroRef}
          className="relative overflow-hidden rounded-3xl border border-[#3F3F46] bg-[#27272A] p-6 text-white shadow-sm sm:p-8"
        >
          <Crosshair
            containerRef={heroRef}
            color="#C4F000"
            opacity={0.28}
            fade={0.35}
            targetEffect="lock"
            showCoordinates
            clickPulse
          />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#3F3F46] bg-[#18181B]/70 px-3 py-1 text-[11px] font-semibold text-[#C4F000]">
                  <Zap className="h-3.5 w-3.5" />
                  LINKORA Workspace Overview
                </div>
                <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                </h1>
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  Create short links, launch custom QR codes, and monitor real-time Neon telemetry.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-1 rounded-xl border border-[#3F3F46] bg-[#18181B] p-1">
                  <button
                    type="button"
                    onClick={() => setCreateMode('link')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      createMode === 'link'
                        ? 'bg-[#C4F000] text-[#18181B]'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Short link
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('qr')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      createMode === 'qr'
                        ? 'bg-[#C4F000] text-[#18181B]'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR Code
                  </button>
                </div>

                <Link
                  to="/create"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#3F3F46] bg-[#3F3F46]/60 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#3F3F46]"
                >
                  <Plus className="h-3.5 w-3.5 text-[#C4F000]" />
                  Full Builder
                </Link>
              </div>
            </div>

            <form
              onSubmit={handleQuickCreate}
              className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white text-[#18181B] shadow-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
            >
              <div className="border-b border-[#E4E4E7] px-4 py-3.5 dark:border-[#3F3F46]">
                <div className="flex items-center gap-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-[#71717A]" />
                  <input
                    type="url"
                    required
                    value={originalUrl}
                    onChange={(e) => setOriginalUrl(e.target.value)}
                    placeholder="Paste your long URL (https://example.com/campaign)..."
                    className="w-full bg-transparent text-sm text-[#18181B] placeholder:text-[#71717A] focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs font-semibold text-[#71717A]">
                    {getDisplayBaseHost(links[0]?.shortUrl)} /
                  </span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="custom-slug (optional)"
                    className="w-44 rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] px-2.5 py-1.5 font-mono text-xs text-[#18181B] placeholder:text-[#71717A] focus:border-[#27272A] focus:bg-white focus:outline-none dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white"
                  />
                  <div className="flex items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] px-2 py-1 dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <CalendarClock className="h-3.5 w-3.5 text-[#71717A]" />
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      title="Optional expiration date"
                      className="bg-transparent text-[11px] text-[#18181B] focus:outline-none dark:text-zinc-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C4F000] px-5 py-2.5 text-xs font-bold text-[#18181B] shadow-xs transition hover:bg-[#d2f833] disabled:opacity-60"
                >
                  {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {createMode === 'qr' ? 'Create QR Code' : 'Quick Create Link'}
                </button>
              </div>
            </form>

            {slugNotice && (
              <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/15 px-3 py-2 text-xs font-medium text-[#F59E0B]">
                {slugNotice}
              </div>
            )}

            {createError && (
              <div className="rounded-xl border border-[#DC2626]/40 bg-[#DC2626]/15 px-4 py-2.5 text-xs font-medium text-red-200">
                {createError}
              </div>
            )}

            {recentCreatedLink && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C4F000]/40 bg-[#18181B]/90 px-4 py-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#C4F000]">Short link created</div>
                  <a
                    href={recentCreatedLink.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 truncate font-mono font-bold text-white hover:underline"
                  >
                    {recentCreatedLink.shortUrl}
                    <ExternalLink className="h-3 w-3 shrink-0 text-[#C4F000]" />
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void handleCopy(recentCreatedLink.id, recentCreatedLink.shortUrl)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C4F000] px-3 py-1.5 font-bold text-[#18181B] transition hover:bg-[#d2f833]"
                >
                  {copiedId === recentCreatedLink.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Link
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 4 Overview KPI Cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#71717A] dark:text-zinc-400">
              <span>Total Links Created</span>
              <Link2 className="h-4 w-4 text-[#18181B] dark:text-[#C4F000]" />
            </div>
            <div className="mt-2.5 text-2xl font-extrabold text-[#18181B] dark:text-white">
              {summary.totalLinks}
            </div>
            <div className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">
              {summary.disabledLinks} paused
            </div>
          </div>

          <div className="rounded-2xl border border-[#3F3F46] bg-[#27272A] p-5 text-white shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>Total Clicks</span>
              <MousePointerClick className="h-4 w-4 text-[#C4F000]" />
            </div>
            <div className="mt-2.5 text-2xl font-extrabold text-[#C4F000]">
              {summary.totalClicks.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              {summary.uniqueVisitors.toLocaleString()} unique visitors
            </div>
          </div>

          <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#71717A] dark:text-zinc-400">
              <span>Active Links</span>
              <Activity className="h-4 w-4 text-[#16A34A]" />
            </div>
            <div className="mt-2.5 text-2xl font-extrabold text-[#16A34A]">
              {summary.activeLinks}
            </div>
            <div className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">Routing HTTP 302</div>
          </div>

          <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#71717A] dark:text-zinc-400">
              <span>Expired Links</span>
              <Clock className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div className="mt-2.5 text-2xl font-extrabold text-[#F59E0B]">
              {summary.expiredLinks}
            </div>
            <div className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">
              Recoverable via QR Rescue
            </div>
          </div>
        </section>

        {/* Click Activity Chart + Device Breakdown + Top Referrers */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A] sm:p-6 lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#18181B] dark:text-white">
                  Click Activity Chart
                </h2>
                <p className="text-xs text-[#71717A] dark:text-zinc-400">
                  Real-time click &amp; QR scan trend
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-1 dark:border-[#3F3F46] dark:bg-[#18181B]">
                {(['7d', '30d', '90d', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition ${
                      preset === p
                        ? 'bg-[#27272A] text-[#C4F000] dark:bg-[#C4F000] dark:text-[#18181B]'
                        : 'text-[#71717A] hover:text-[#18181B] dark:text-zinc-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {overviewLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#27272A] dark:text-[#C4F000]" />
              </div>
            ) : !overview || overview.clicksOverTime.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] text-center dark:border-[#3F3F46]">
                <BarChart3 className="h-8 w-8 text-[#71717A]" />
                <p className="mt-2 text-xs text-[#71717A] dark:text-zinc-400">
                  No clicks recorded in this period yet. Visit any short link to record telemetry.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview.clicksOverTime}>
                    <defs>
                      <linearGradient id="dashLimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C4F000" stopOpacity={0.55} />
                        <stop offset="95%" stopColor="#C4F000" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme === 'dark' ? '#3F3F46' : '#E4E4E7'}
                    />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717A' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#27272A',
                        borderColor: '#3F3F46',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke={theme === 'dark' ? '#C4F000' : '#27272A'}
                      strokeWidth={2.5}
                      fill="url(#dashLimeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-6 lg:col-span-5">
            {/* Device Breakdown */}
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#18181B] dark:text-white">
                  <Laptop className="h-4 w-4 text-[#71717A]" />
                  Device Breakdown
                </h2>
                <Link
                  to="/analytics"
                  className="text-xs font-semibold text-[#18181B] underline decoration-[#C4F000] decoration-2 dark:text-white"
                >
                  Details
                </Link>
              </div>

              {devices.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#71717A]">
                  No device data recorded yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {devices.slice(0, 4).map((d) => {
                    const pct = Math.round((d.count / totalDeviceClicks) * 100);
                    return (
                      <div key={d.deviceType}>
                        <div className="mb-1 flex justify-between text-xs font-medium">
                          <span className="text-[#18181B] dark:text-white">{d.deviceType}</span>
                          <span className="font-mono text-[#71717A] dark:text-zinc-300">
                            {d.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-[#18181B]">
                          <div
                            className="h-full rounded-full bg-[#27272A] dark:bg-[#C4F000]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Referrers */}
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#18181B] dark:text-white">
                  <Globe className="h-4 w-4 text-[#71717A]" />
                  Top Referrers
                </h2>
                <span className="text-[11px] font-semibold text-[#71717A]">Hostnames</span>
              </div>

              {referrers.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#71717A]">
                  No referrer traffic recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {referrers.slice(0, 4).map((r) => (
                    <div
                      key={r.referrer}
                      className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-3 py-2 text-xs dark:border-[#3F3F46] dark:bg-[#18181B]"
                    >
                      <span className="truncate font-semibold text-[#18181B] dark:text-white">
                        {r.referrer}
                      </span>
                      <span className="rounded-md bg-[#27272A] px-2 py-0.5 font-mono text-[11px] font-bold text-[#C4F000]">
                        {r.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Recent Links */}
        <section className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A] sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#18181B] dark:text-white">Recent Links</h2>
            <Link
              to="/links"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#18181B] underline decoration-[#C4F000] decoration-2 dark:text-white"
            >
              Manage all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E4E4E7] py-10 text-center text-xs text-[#71717A] dark:border-[#3F3F46]">
              No links yet. Use the Quick Create bar above to generate your first short link.
            </div>
          ) : (
            <div className="space-y-3">
              {links.slice(0, 5).map((link) => (
                <div
                  key={link.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-3.5 transition hover:border-[#27272A] dark:border-[#3F3F46] dark:bg-[#18181B] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#18181B] underline decoration-[#C4F000] decoration-2 dark:text-white"
                      >
                        /{link.slug}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleCopy(link.id, link.shortUrl)}
                        className="rounded p-1 text-[#71717A] hover:bg-white hover:text-[#18181B] dark:hover:bg-[#3F3F46] dark:hover:text-white"
                        title="Copy short URL"
                      >
                        {copiedId === link.id ? (
                          <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <StatusBadge status={link.status} />
                      <span className="font-mono text-[11px] font-semibold text-[#71717A]">
                        {link.clickCount} clicks
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#71717A] dark:text-zinc-400">
                      {link.originalUrl}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrModalLink(link)}
                      className="rounded-lg border border-[#E4E4E7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#18181B] hover:border-[#27272A] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white"
                    >
                      QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setRescueModalLink(link)}
                      className="rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-1.5 text-xs font-semibold text-[#B45309] hover:bg-[#F59E0B]/20 dark:text-[#FBBF24]"
                    >
                      Rescue
                    </button>
                    <Link
                      to={`/analytics/${link.id}`}
                      className="rounded-lg border border-[#E4E4E7] bg-white p-1.5 text-[#18181B] hover:border-[#27272A] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white"
                      title="Link Analytics"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <QrCodeModal
        link={qrModalLink}
        onClose={() => {
          setQrModalLink(null);
          void loadOverview();
        }}
      />
      <QrRescueModal
        link={rescueModalLink}
        onClose={() => setRescueModalLink(null)}
        onSaved={() => void loadOverview()}
      />
    </AppLayout>
  );
}

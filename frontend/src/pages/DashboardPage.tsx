import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  LifeBuoy,
  Link2,
  Loader2,
  MousePointerClick,
  QrCode,
  Sparkles,
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

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const claimNotice = useAuthStore((s) => s.claimNotice);
  const clearClaimNotice = useAuthStore((s) => s.clearClaimNotice);
  const { links, isLoading: linksLoading, fetchLinks, createLink } = useLinkStore();
  const [dismissGuestNotice, setDismissGuestNotice] = useState(false);

  // Quick Creator state (Short link / QR Code mode toggle like reference screenshot)
  const [createMode, setCreateMode] = useState<'link' | 'qr'>('link');
  const [originalUrl, setOriginalUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugNotice, setSlugNotice] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Overview analytics state
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [overview, setOverview] = useState<OverviewAnalyticsResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Modals & UI feedback
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

  // Auto-open QR Rescue Modal when arriving from /rescue/:slug
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
          : `No link with slug "/${rescueSlugParam}" was found in this browser session. If you saved it to an account, sign in to rescue it.`
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
      setQrModalLink(created);
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {claimNotice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              {claimNotice}
            </span>
            <button
              type="button"
              onClick={clearClaimNotice}
              className="ml-4 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {!token && links.length > 0 && !dismissGuestNotice && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
            <span>
              <strong>Temporary session mode:</strong> Your {links.length} link
              {links.length === 1 ? '' : 's'} will stay active for 24 hours in this browser. Sign in
              only if you want to store your data permanently.
            </span>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white transition hover:bg-blue-700"
              >
                Save to Account
              </Link>
              <button
                type="button"
                onClick={() => setDismissGuestNotice(true)}
                className="font-semibold text-blue-700 underline dark:text-blue-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {rescueNotice && (
          <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span>{rescueNotice}</span>
            <button
              type="button"
              onClick={() => setRescueNotice(null)}
              className="ml-4 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Quick-Create Card inspired by Reference Screenshot 1 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              What do you want to create{user?.name ? `, ${user.name.split(' ')[0]}` : ''}?
            </h1>

            {/* Pill Switcher */}
            <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
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
              onSubmit={handleQuickCreate}
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
                    placeholder="Enter your long URL (https://example.com/campaign)..."
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {getDisplayBaseHost(links[0]?.shortUrl)} /
                  </span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="custom-slug (optional)"
                    className="w-44 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      title="Optional expiration date"
                      className="bg-transparent text-[11px] text-slate-700 focus:outline-none dark:text-slate-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {createMode === 'qr' ? 'Create QR Code' : 'Create link'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-teal-50/80 px-4 py-2 text-xs text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  Dynamic QR Rescue enabled — update destination URLs anytime without changing your QR code.
                </span>
                <Link to="/create" className="hidden font-semibold underline sm:inline">
                  Full builder
                </Link>
              </div>
            </form>

            {slugNotice && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                {slugNotice}
              </div>
            )}

            {createError && (
              <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {createError}
              </div>
            )}
          </div>
        </section>

        {/* Overview KPI Row */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Total Links Created</span>
              <Link2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {summary.totalLinks}
            </div>
            <div className="mt-1 text-xs text-slate-500">{summary.activeLinks} active now</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Clicks &amp; QR Scans</span>
              <MousePointerClick className="h-4 w-4 text-teal-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {summary.totalClicks.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {summary.uniqueVisitors.toLocaleString()} unique visitors
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Active QR Routes</span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.activeLinks}
            </div>
            <div className="mt-1 text-xs text-slate-500">Sub-5ms cached redirects</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Expired / Paused</span>
              <LifeBuoy className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary.expiredLinks + summary.disabledLinks}
            </div>
            <Link
              to="/manage"
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Rescue or reactivate <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {/* Performance Chart + Top Performing Links */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Click Performance Over Time
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Combined short link clicks &amp; QR code scans
                </p>
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                {(['7d', '30d', '90d', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition ${
                      preset === p
                        ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-950 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {overviewLoading && !overview ? (
              <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                Loading performance data...
              </div>
            ) : !overview || overview.clicksOverTime.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                No clicks recorded in this date range yet.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={overview.clicksOverTime}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dashGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '10px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="url(#dashGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Top-Performing Links
              </h2>
              <Link
                to="/analytics"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Full analytics <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {!overview || overview.topLinks.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-500">
                Create and share links to see top performers.
              </p>
            ) : (
              <div className="space-y-3">
                {overview.topLinks.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <Link
                          to={`/analytics/${item.id}`}
                          className="truncate font-mono text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          /{item.slug}
                        </Link>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.originalUrl}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.clicks.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">clicks</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Links & Recent Visitor Activity */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Links
              </h2>
              <Link
                to="/links"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View all links <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {links.slice(0, 5).map((link) => (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        /{link.slug}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleCopy(link.id, link.shortUrl)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        title="Copy short URL"
                      >
                        {copiedId === link.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <StatusBadge status={link.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {link.originalUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrModalLink(link)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setRescueModalLink(link)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      Rescue
                    </button>
                    <Link
                      to={`/analytics/${link.id}`}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      title="Link Analytics"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5 sm:p-6">
            <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
              Recent Link Activity
            </h2>
            {!overview || overview.recentActivity.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-500">
                No recent click or scan activity recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {overview.recentActivity.slice(0, 6).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 text-xs last:border-0 last:pb-0 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          /{act.slug}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {act.deviceType}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        From {act.referrer} ({act.region})
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {new Date(act.clickedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

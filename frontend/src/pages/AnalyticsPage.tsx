import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  MapPin,
  MousePointerClick,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Users
} from 'lucide-react';
import { api } from '../lib/api';
import { AnalyticsResponse, LinkItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { useAuthStore } from '../store/useAuthStore';

type Preset = '7d' | '30d' | '90d' | 'all';
type TrendMode = 'day' | 'hour' | 'month';

function getFromIso(preset: Preset): string | undefined {
  const now = Date.now();
  if (preset === '7d') return new Date(now - 7 * 86400_000).toISOString();
  if (preset === '30d') return new Date(now - 30 * 86400_000).toISOString();
  if (preset === '90d') return new Date(now - 90 * 86400_000).toISOString();
  return undefined;
}

export function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const theme = useAuthStore((s) => s.theme);
  const [preset, setPreset] = useState<Preset>('30d');
  const [trendMode, setTrendMode] = useState<TrendMode>('day');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [linkItem, setLinkItem] = useState<LinkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrLink, setQrLink] = useState<LinkItem | null>(null);
  const [rescueLink, setRescueLink] = useState<LinkItem | null>(null);

  const apiGranularity: 'day' | 'hour' = trendMode === 'hour' ? 'hour' : 'day';

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [analyticsRes, linkRes] = await Promise.all([
        api.analytics.get(id, { granularity: apiGranularity, from: getFromIso(preset) }),
        api.links.get(id)
      ]);
      setData(analyticsRes);
      setLinkItem(linkRes.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load link analytics.');
    } finally {
      setLoading(false);
    }
  }, [id, apiGranularity, preset]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartSeries = useMemo(() => {
    if (!data) return [];
    if (trendMode !== 'month') return data.clicksOverTime;
    const monthly = new Map<string, { label: string; timestamp: string; clicks: number }>();
    for (const point of data.clicksOverTime) {
      const date = new Date(point.timestamp);
      const key = Number.isNaN(date.getTime())
        ? point.timestamp.slice(0, 7)
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = Number.isNaN(date.getTime())
        ? key
        : date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      const existing = monthly.get(key);
      if (existing) {
        existing.clicks += point.clicks;
      } else {
        monthly.set(key, { label, timestamp: key, clicks: point.clicks });
      }
    }
    return Array.from(monthly.values());
  }, [data, trendMode]);

  const maxReferrerCount = useMemo(
    () => Math.max(1, ...(data?.referrers.map((r) => r.count) ?? [1])),
    [data]
  );

  const maxRegionCount = useMemo(
    () => Math.max(1, ...(data?.regions.map((r) => r.count) ?? [1])),
    [data]
  );

  const handleCopy = async () => {
    if (!linkItem) return;
    await navigator.clipboard.writeText(linkItem.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#3F3F46' : '#E4E4E7';
  const axisTickColor = isDark ? '#A1A1AA' : '#71717A';
  const areaStroke = isDark ? '#C4F000' : '#27272A';
  const barFill = isDark ? '#C4F000' : '#27272A';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3.5 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Analytics Overview
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#E4E4E7] bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(['7d', '30d', '90d', 'all'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPreset(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${
                  preset === item
                    ? 'bg-[#27272A] text-[#C4F000] dark:bg-[#C4F000] dark:text-[#18181B]'
                    : 'text-[#71717A] hover:text-[#18181B] dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-xl border border-[#E4E4E7] bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(['hour', 'day', 'month'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTrendMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  trendMode === mode
                    ? 'bg-[#27272A] text-white dark:bg-white dark:text-[#18181B]'
                    : 'text-[#71717A] hover:text-[#18181B] dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#27272A] px-3.5 py-2 text-xs font-semibold text-[#C4F000] hover:bg-[#3F3F46]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      {linkItem && (
        <section className="rounded-3xl bg-[#27272A] p-6 text-white shadow-soft sm:p-7">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-2xl font-bold text-[#C4F000]">/{linkItem.slug}</h1>
                <StatusBadge status={linkItem.status} />
                {linkItem.isCached && (
                  <span className="rounded-full border border-white/15 bg-[#3F3F46] px-2.5 py-0.5 text-[11px] font-medium text-zinc-200">
                    Edge Cached
                  </span>
                )}
              </div>
              <p className="mt-2 truncate text-sm text-zinc-300" title={linkItem.originalUrl}>
                Destination: {linkItem.originalUrl}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-400">{linkItem.shortUrl}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C4F000] px-3.5 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#b2dc00]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
              <button
                type="button"
                onClick={() => setQrLink(linkItem)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#3F3F46] px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-600"
              >
                <QrCode className="h-3.5 w-3.5 text-[#C4F000]" />
                QR Studio
              </button>
              <button
                type="button"
                onClick={() => setRescueLink(linkItem)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#3F3F46] px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-600"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-[#F59E0B]" />
                Edit / Rescue
              </button>
              <a
                href={linkItem.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
              >
                Visit
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>
      )}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-[#E4E4E7] bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#27272A] bg-[#27272A] p-5 text-white">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <span>Total Clicks</span>
                <span className="rounded-lg bg-[#C4F000] p-1.5 text-[#18181B]">
                  <MousePointerClick className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#C4F000]">
                {data.totalClicks.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-400">Recorded hits</p>
            </div>

            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A] dark:text-zinc-400">
                <span>Unique Visitors</span>
                <span className="rounded-lg bg-[#F4F4F5] p-1.5 text-[#18181B] dark:bg-zinc-800 dark:text-[#C4F000]">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#18181B] dark:text-white">
                {data.uniqueVisitors.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">Distinct visitors</p>
            </div>

            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A] dark:text-zinc-400">
                <span>Primary Referrer</span>
                <span className="rounded-lg bg-[#F4F4F5] p-1.5 text-[#18181B] dark:bg-zinc-800 dark:text-[#C4F000]">
                  <Globe2 className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 truncate font-display text-xl font-bold text-[#18181B] dark:text-white">
                {data.referrers[0]?.referrer ?? 'Direct / None'}
              </p>
              <p className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">
                {data.referrers[0]?.count ?? 0} referrals
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A] dark:text-zinc-400">
                <span>Top Region</span>
                <span className="rounded-lg bg-[#F4F4F5] p-1.5 text-[#18181B] dark:bg-zinc-800 dark:text-[#C4F000]">
                  <MapPin className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 truncate font-display text-xl font-bold text-[#18181B] dark:text-white">
                {data.regions[0]?.region ?? 'Unknown'}
              </p>
              <p className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">
                {data.regions[0]?.count ?? 0} clicks
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
              <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                Click Trend ({trendMode})
              </h2>
              <div className="mt-4 h-72 w-full">
                {chartSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartSeries} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="linkDetailFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C4F000" stopOpacity={0.55} />
                          <stop offset="95%" stopColor="#C4F000" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: axisTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: axisTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#27272A',
                          borderColor: '#3F3F46',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke={areaStroke}
                        strokeWidth={2.5}
                        fill="url(#linkDetailFill)"
                        activeDot={{ r: 5, fill: '#C4F000', stroke: '#27272A', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#71717A] dark:text-zinc-400">
                    No click timeline data yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">Devices</h2>
                <Smartphone className="h-4 w-4 text-[#71717A]" />
              </div>
              <div className="h-72 w-full">
                {data.devices.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.devices} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="deviceType" tick={{ fill: axisTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: axisTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#27272A',
                          borderColor: '#3F3F46',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="count" fill={barFill} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#71717A] dark:text-zinc-400">
                    No device telemetry yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 font-display text-lg font-bold text-[#18181B] dark:text-white">
                Referrers
              </h2>
              {data.referrers.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#71717A] dark:text-zinc-400">No referrer records.</p>
              ) : (
                <div className="space-y-3">
                  {data.referrers.map((item) => (
                    <div key={item.referrer} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#18181B] dark:text-zinc-200">{item.referrer}</span>
                        <span className="font-mono font-semibold text-[#18181B] dark:text-[#C4F000]">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-[#27272A] dark:bg-[#C4F000]"
                          style={{ width: `${Math.max(6, Math.round((item.count / maxReferrerCount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 font-display text-lg font-bold text-[#18181B] dark:text-white">
                Regions / Countries
              </h2>
              {data.regions.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#71717A] dark:text-zinc-400">No region records.</p>
              ) : (
                <div className="space-y-3">
                  {data.regions.map((item) => (
                    <div key={item.region} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#18181B] dark:text-zinc-200">{item.region}</span>
                        <span className="font-mono font-semibold text-[#18181B] dark:text-[#C4F000]">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-[#C4F000]"
                          style={{ width: `${Math.max(6, Math.round((item.count / maxRegionCount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#E4E4E7] bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-[#E4E4E7] px-6 py-4 dark:border-zinc-800">
              <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                Recent Visitor Click History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F4F4F5] text-xs uppercase tracking-wider text-[#71717A] dark:bg-zinc-950/60 dark:text-zinc-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Timestamp</th>
                    <th className="px-6 py-3 font-semibold">Referrer</th>
                    <th className="px-6 py-3 font-semibold">Device</th>
                    <th className="px-6 py-3 font-semibold">Region</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7] dark:divide-zinc-800">
                  {data.recentClicks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-[#71717A] dark:text-zinc-400">
                        No clicks recorded for this link yet.
                      </td>
                    </tr>
                  ) : (
                    data.recentClicks.map((click) => (
                      <tr key={click.id} className="hover:bg-[#F4F4F5]/60 dark:hover:bg-zinc-800/40">
                        <td className="px-6 py-3 text-xs text-[#18181B] dark:text-zinc-200">
                          {new Date(click.clickedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-xs font-medium text-[#18181B] dark:text-zinc-200">
                          {click.referrer}
                        </td>
                        <td className="px-6 py-3 text-xs text-[#71717A] dark:text-zinc-400">{click.deviceType}</td>
                        <td className="px-6 py-3 text-xs text-[#71717A] dark:text-zinc-400">{click.region}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {qrLink && <QrCodeModal link={qrLink} onClose={() => setQrLink(null)} />}
      {rescueLink && (
        <QrRescueModal
          link={rescueLink}
          onClose={() => {
            setRescueLink(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

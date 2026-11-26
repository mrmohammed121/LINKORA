import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  BarChart3,
  Calendar,
  ExternalLink,
  Globe2,
  MapPin,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users
} from 'lucide-react';
import { api } from '../lib/api';
import { OverviewAnalyticsResponse } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuthStore } from '../store/useAuthStore';

/* ── Country flag emoji helper ─────────────────────────────────────────── */
const countryFlag = (name: string): string => {
  const map: Record<string, string> = {
    'United Kingdom': '🇬🇧', 'United States': '🇺🇸', 'Australia': '🇦🇺',
    'Canada': '🇨🇦', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
    'India': '🇮🇳', 'Mexico': '🇲🇽', 'Japan': '🇯🇵', 'Brazil': '🇧🇷',
    'China': '🇨🇳', 'South Korea': '🇰🇷', 'Russia': '🇷🇺', 'Italy': '🇮🇹',
    'Netherlands': '🇳🇱', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰',
    'Switzerland': '🇨🇭', 'Poland': '🇵🇱', 'Turkey': '🇹🇷', 'Argentina': '🇦🇷',
    'South Africa': '🇿🇦', 'Nigeria': '🇳🇬', 'Egypt': '🇪🇬', 'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩', 'Indonesia': '🇮🇩', 'Malaysia': '🇲🇾', 'Singapore': '🇸🇬',
    'Philippines': '🇵🇭', 'Vietnam': '🇻🇳', 'Thailand': '🇹🇭', 'UAE': '🇦🇪',
    'Saudi Arabia': '🇸🇦', 'Israel': '🇮🇱', 'Iran': '🇮🇷', 'Iraq': '🇮🇶',
    'Ukraine': '🇺🇦', 'Portugal': '🇵🇹', 'Belgium': '🇧🇪', 'Austria': '🇦🇹',
    'Greece': '🇬🇷', 'Czech Republic': '🇨🇿', 'Romania': '🇷🇴', 'Hungary': '🇭🇺',
    'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Venezuela': '🇻🇪',
    'New Zealand': '🇳🇿', 'Finland': '🇫🇮', 'Ireland': '🇮🇪', 'Unknown': '🌐',
  };
  if (map[name]) return map[name];
  // try to build from 2-letter ISO code embedded in region string
  const upper = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (upper.length >= 2) {
    try {
      return String.fromCodePoint(
        ...[...upper.slice(0, 2)].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
      );
    } catch { /* ignore */ }
  }
  return '🌐';
};

/* ── Donut chart colours ───────────────────────────────────────────────── */
const DEVICE_COLORS = ['#2DD4BF', '#7C3AED', '#F97316', '#3B82F6', '#EAB308', '#EC4899', '#10B981'];

type Preset = '7d' | '30d' | '90d' | 'all' | 'custom';
type TrendMode = 'day' | 'hour' | 'month';

function getFromIso(preset: Preset): string | undefined {
  const now = Date.now();
  if (preset === '7d') return new Date(now - 7 * 86400_000).toISOString();
  if (preset === '30d') return new Date(now - 30 * 86400_000).toISOString();
  if (preset === '90d') return new Date(now - 90 * 86400_000).toISOString();
  return undefined;
}

export function AnalyticsOverviewPage() {
  const { user, theme } = useAuthStore();
  const isAuthenticated = Boolean(user);
  const [preset, setPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [trendMode, setTrendMode] = useState<TrendMode>('day');
  const [data, setData] = useState<OverviewAnalyticsResponse | null>(null);
  const [prevData, setPrevData] = useState<OverviewAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiGranularity: 'day' | 'hour' = trendMode === 'hour' ? 'hour' : 'day';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let from: string | undefined;
      let to: string | undefined;
      let prevFrom: string | undefined;
      let prevTo: string | undefined;

      if (preset === 'custom') {
        from = customFrom ? new Date(customFrom).toISOString() : undefined;
        to = customTo ? new Date(`${customTo}T23:59:59`).toISOString() : undefined;
        // prev period = same window length before `from`
        if (from && to) {
          const dur = new Date(to).getTime() - new Date(from).getTime();
          prevTo = from;
          prevFrom = new Date(new Date(from).getTime() - dur).toISOString();
        }
      } else {
        from = getFromIso(preset);
        // prev period = same duration before `from`
        if (from) {
          const dur = Date.now() - new Date(from).getTime();
          prevTo = from;
          prevFrom = new Date(new Date(from).getTime() - dur).toISOString();
        }
      }

      const [current, previous] = await Promise.all([
        api.analytics.overview({ granularity: apiGranularity, from, to }),
        (prevFrom && prevTo)
          ? api.analytics.overview({ granularity: apiGranularity, from: prevFrom, to: prevTo }).catch(() => null)
          : Promise.resolve(null),
      ]);
      setData(current);
      setPrevData(previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics overview.');
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo, apiGranularity]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartSeries = useMemo(() => {
    if (!data) return [];
    if (trendMode !== 'month') {
      return data.clicksOverTime;
    }

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


  /* ── Derived: device donut data with % of total ─────────────────────── */
  const deviceTotal = useMemo(() => data?.devices.reduce((s, d) => s + d.count, 0) ?? 0, [data]);
  const deviceDonut = useMemo(() =>
    (data?.devices ?? []).map((d) => ({
      name: d.deviceType,
      value: d.count,
      pct: deviceTotal > 0 ? Math.round((d.count / deviceTotal) * 1000) / 10 : 0,
    })),
    [data, deviceTotal]
  );

  /* ── Derived: region table rows with % share and vs-prev ────────────── */
  const regionTotal = useMemo(() => data?.regions.reduce((s, r) => s + r.count, 0) ?? 0, [data]);
  const prevRegionMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of prevData?.regions ?? []) m.set(r.region, r.count);
    return m;
  }, [prevData]);

  const regionRows = useMemo(() =>
    (data?.regions ?? []).map((r) => {
      const pct = regionTotal > 0 ? Math.round((r.count / regionTotal) * 1000) / 10 : 0;
      const prev = prevRegionMap.get(r.region) ?? 0;
      const vsPrev = prev > 0 ? Math.round(((r.count - prev) / prev) * 1000) / 10 : null;
      return { region: r.region, count: r.count, pct, vsPrev };
    }),
    [data, regionTotal, prevRegionMap]
  );

  /* ── Derived: top location card ─────────────────────────────────────── */
  const topRegion = useMemo(() => {
    if (!regionRows.length) return null;
    const top = regionRows[0];
    const prevTotal = prevData?.summary.totalClicks ?? 0;
    const prevTopCount = prevRegionMap.get(top.region) ?? 0;
    return {
      ...top,
      prevCount: prevTopCount,
      vsPrevTotal: prevTotal > 0 ? Math.round(((top.count - prevTopCount) / Math.max(1, prevTopCount)) * 1000) / 10 : null,
    };
  }, [regionRows, prevData, prevRegionMap]);

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#3F3F46' : '#E4E4E7';
  const axisTickColor = isDark ? '#A1A1AA' : '#71717A';
  const areaStroke = isDark ? '#E9FFDB' : '#27272A';

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#27272A] p-6 text-white shadow-soft sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#3F3F46] px-3 py-1 text-xs font-medium text-[#E9FFDB]">
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics Overview
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {isAuthenticated ? 'Workspace Click Intelligence' : 'Guest Session Analytics'}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-300">
              Monitor real-time click velocity, device splits, geographic regions, referrer channels, and top-performing short links.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl border border-white/15 bg-[#3F3F46] p-1">
              {(
                [
                  { id: '7d', label: '7D' },
                  { id: '30d', label: '30D' },
                  { id: '90d', label: '90D' },
                  { id: 'all', label: 'All' },
                  { id: 'custom', label: 'Custom' }
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    preset === item.id
                      ? 'bg-[#E9FFDB] text-[#18181B]'
                      : 'text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-white/15 bg-[#3F3F46] p-1">
              {(
                [
                  { id: 'hour', label: 'Hour' },
                  { id: 'day', label: 'Day' },
                  { id: 'month', label: 'Month' }
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTrendMode(mode.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    trendMode === mode.id
                      ? 'bg-white text-[#18181B]'
                      : 'text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E9FFDB] px-3.5 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#D7F9C2]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {preset === 'custom' && (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-[#3F3F46]/60 p-3.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-zinc-300">
                From Date
              </label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-white/15 bg-[#27272A] px-3 py-1.5 text-xs text-white outline-none focus:border-[#E9FFDB]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-zinc-300">
                To Date
              </label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-white/15 bg-[#27272A] px-3 py-1.5 text-xs text-white outline-none focus:border-[#E9FFDB]"
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-[#E9FFDB] px-3.5 py-1.5 text-xs font-semibold text-[#18181B] hover:bg-[#D7F9C2]"
            >
              Apply Range
            </button>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </div>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#27272A] bg-[#27272A] p-4 text-white">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E9FFDB]">
                <Sparkles className="h-3.5 w-3.5" />
                Peak Engagement Window
              </div>
              <p className="mt-2 font-display text-base font-bold">
                {data.insights.peakEngagement
                  ? `${data.insights.peakEngagement.label} (${data.insights.peakEngagement.clicks} clicks)`
                  : 'No activity recorded yet'}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                <Globe2 className="h-3.5 w-3.5 text-[#18181B] dark:text-[#E9FFDB]" />
                Leading Traffic Channel
              </div>
              <p className="mt-2 font-display text-base font-bold text-[#18181B] dark:text-white">
                {data.insights.topChannel
                  ? `${data.insights.topChannel.referrer} (${data.insights.topChannel.count} clicks)`
                  : 'Direct / None'}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                <TrendingUp className="h-3.5 w-3.5 text-[#16A34A]" />
                Top Performing Link
              </div>
              {data.insights.topLink ? (
                <Link
                  to={`/analytics/${data.insights.topLink.id}`}
                  className="mt-2 inline-flex items-center gap-1.5 font-display text-base font-bold text-[#18181B] hover:underline dark:text-[#E9FFDB]"
                >
                  /{data.insights.topLink.slug}
                  <span className="text-xs font-medium text-[#71717A] dark:text-zinc-400">
                    ({data.insights.topLink.clicks} clicks)
                  </span>
                </Link>
              ) : (
                <p className="mt-2 text-sm text-[#71717A] dark:text-zinc-400">No recent click spike yet</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#27272A] bg-[#27272A] p-5 text-white shadow-soft">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <span>Total Clicks</span>
                <span className="rounded-lg bg-[#E9FFDB] p-1.5 text-[#18181B]">
                  <MousePointerClick className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#E9FFDB]">
                {data.summary.totalClicks.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-400">Across selected window</p>
            </div>

            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A] dark:text-zinc-400">
                <span>Unique Visitors</span>
                <span className="rounded-lg bg-[#F4F4F5] p-1.5 text-[#18181B] dark:bg-zinc-800 dark:text-[#E9FFDB]">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#18181B] dark:text-white">
                {data.summary.uniqueVisitors.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">Deduplicated sessions</p>
            </div>

            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A] dark:text-zinc-400">
                <span>Tracked Links</span>
                <span className="rounded-lg bg-[#F4F4F5] p-1.5 text-[#18181B] dark:bg-zinc-800 dark:text-[#E9FFDB]">
                  <Activity className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#18181B] dark:text-white">
                {data.summary.totalLinks}
              </p>
              <p className="mt-1 text-xs text-[#16A34A]">{data.summary.activeLinks} active</p>
            </div>

            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A] dark:text-zinc-400">
                <span>Avg Clicks / Link</span>
                <span className="rounded-lg bg-[#F4F4F5] p-1.5 text-[#18181B] dark:bg-zinc-800 dark:text-[#E9FFDB]">
                  <Calendar className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#18181B] dark:text-white">
                {data.summary.totalLinks > 0
                  ? (data.summary.totalClicks / data.summary.totalLinks).toFixed(1)
                  : '0.0'}
              </p>
              <p className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">Engagement ratio</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                    Click Trends
                  </h2>
                  <p className="text-xs text-[#71717A] dark:text-zinc-400">
                    Grouped by {trendMode === 'hour' ? 'hour' : trendMode === 'month' ? 'month' : 'day'}
                  </p>
                </div>
                <span className="rounded-full bg-[#E9FFDB]/25 px-3 py-1 text-xs font-semibold text-[#18181B] dark:text-[#E9FFDB]">
                  Real Traffic
                </span>
              </div>

              <div className="h-72 w-full">
                {chartSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartSeries} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="linkoraClicksFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E9FFDB" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#E9FFDB" stopOpacity={0.12} />
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
                        fill="url(#linkoraClicksFill)"
                        activeDot={{ r: 5, fill: '#E9FFDB', stroke: '#27272A', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#71717A] dark:text-zinc-400">
                    No click events recorded in this date window yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                    Clicks by Device
                  </h2>
                  <p className="text-xs text-[#71717A] dark:text-zinc-400">Visitor client categories</p>
                </div>
                <Smartphone className="h-4 w-4 text-[#71717A]" />
              </div>

              {deviceDonut.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {/* Donut */}
                  <div className="relative mx-auto h-48 w-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceDonut}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {deviceDonut.map((_, i) => (
                            <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#27272A',
                            borderColor: '#3F3F46',
                            borderRadius: '12px',
                            color: '#FFFFFF',
                            fontSize: '12px',
                          }}
                          formatter={(v: number, name: string) => [`${v} clicks`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centre label */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-2xl font-bold text-[#18181B] dark:text-white">
                        {deviceTotal.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#71717A] dark:text-zinc-400">Clicks</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="space-y-1.5">
                    {deviceDonut.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                          />
                          <span className="font-medium text-[#18181B] dark:text-zinc-200 capitalize">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-[#18181B] dark:text-white">{d.value}</span>
                          <span className="w-10 text-right text-[#71717A] dark:text-zinc-400">{d.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-[#71717A] dark:text-zinc-400">
                  No device telemetry yet.
                </div>
              )}
            </div>
          </div>

          {/* ── Engagements by Location + Top Location card ───────────── */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Location table — takes 2 cols */}
            <div className="rounded-3xl border border-[#E4E4E7] bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E4E4E7] px-6 py-4 dark:border-zinc-800">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                    Clicks by Location
                  </h2>
                  <p className="text-xs text-[#71717A] dark:text-zinc-400 mt-0.5">Country-level breakdown</p>
                </div>
                <MapPin className="h-4 w-4 text-[#71717A]" />
              </div>
              {regionRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#71717A] dark:text-zinc-400">No region telemetry yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F4F4F5] text-xs uppercase tracking-wider text-[#71717A] dark:bg-zinc-950/60 dark:text-zinc-400">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Country</th>
                        <th className="px-5 py-3 font-semibold text-right">Clicks</th>
                        <th className="px-5 py-3 font-semibold text-right">%</th>
                        {prevData && <th className="px-5 py-3 font-semibold text-right">vs prev.</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E4E7] dark:divide-zinc-800">
                      {regionRows.map((row) => (
                        <tr key={row.region} className="hover:bg-[#F4F4F5]/60 dark:hover:bg-zinc-800/40">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg leading-none" role="img" aria-label={row.region}>
                                {countryFlag(row.region)}
                              </span>
                              <span className="font-medium text-[#18181B] dark:text-zinc-200">{row.region}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-[#18181B] dark:text-white">
                            {row.count.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right text-[#71717A] dark:text-zinc-400">
                            {row.pct}%
                          </td>
                          {prevData && (
                            <td className="px-5 py-3 text-right">
                              {row.vsPrev !== null ? (
                                <span className={`font-semibold ${row.vsPrev >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                  {row.vsPrev >= 0 ? '↑' : '↓'} {Math.abs(row.vsPrev)}%
                                </span>
                              ) : (
                                <span className="text-[#71717A] dark:text-zinc-500">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Location card */}
            <div className="flex flex-col gap-4">
              {topRegion && (
                <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                      Top Location
                    </p>
                    <MapPin className="h-3.5 w-3.5 text-[#71717A]" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl" role="img" aria-label={topRegion.region}>
                      {countryFlag(topRegion.region)}
                    </span>
                    <span className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                      {topRegion.region}
                    </span>
                  </div>
                  <p className="font-display text-3xl font-bold text-[#18181B] dark:text-white mt-2">
                    {topRegion.count.toLocaleString()}
                    <span className="ml-1.5 text-sm font-normal text-[#71717A] dark:text-zinc-400">clicks</span>
                  </p>
                  <p className="mt-1 text-sm text-[#71717A] dark:text-zinc-400">
                    {topRegion.pct}% of all traffic
                  </p>
                  {topRegion.vsPrevTotal !== null && (
                    <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      topRegion.vsPrevTotal >= 0
                        ? 'bg-[#E9FFDB]/40 text-[#16A34A]'
                        : 'bg-[#DC2626]/10 text-[#DC2626]'
                    }`}>
                      {topRegion.vsPrevTotal >= 0 ? '↑' : '↓'} {Math.abs(topRegion.vsPrevTotal)}% vs prev period
                    </div>
                  )}
                </div>
              )}

              {/* Top Referrers moved here as compact card */}
              <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 flex-1">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#18181B] dark:text-white">
                    Top Referrers
                  </h2>
                  <Globe2 className="h-4 w-4 text-[#71717A]" />
                </div>
                {data.referrers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[#71717A] dark:text-zinc-400">No referrer data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.referrers.slice(0, 6).map((item) => (
                      <div key={item.referrer} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#18181B] dark:text-zinc-200 truncate max-w-[140px]">{item.referrer}</span>
                          <span className="font-mono font-semibold text-[#18181B] dark:text-[#E9FFDB]">
                            {item.count}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-[#27272A] dark:bg-[#E9FFDB]"
                            style={{ width: `${Math.max(6, Math.round((item.count / maxReferrerCount) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-[#E4E4E7] bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-[#E4E4E7] px-6 py-4 dark:border-zinc-800">
                <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                  Most Popular Links
                </h2>
                <Link
                  to="/links"
                  className="text-xs font-semibold text-[#18181B] hover:underline dark:text-[#E9FFDB]"
                >
                  View All Links
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F4F4F5] text-xs uppercase tracking-wider text-[#71717A] dark:bg-zinc-950/60 dark:text-zinc-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Slug</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Clicks</th>
                      <th className="px-5 py-3 font-semibold">Created</th>
                      <th className="px-5 py-3 text-right font-semibold">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] dark:divide-zinc-800">
                    {data.topLinks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#71717A] dark:text-zinc-400">
                          No links tracked yet.
                        </td>
                      </tr>
                    ) : (
                      data.topLinks.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F4F4F5]/60 dark:hover:bg-zinc-800/40">
                          <td className="px-5 py-3">
                            <p className="font-mono text-xs font-semibold text-[#18181B] dark:text-[#E9FFDB]">
                              /{item.slug}
                            </p>
                            <p className="max-w-[200px] truncate text-xs text-[#71717A] dark:text-zinc-400">
                              {item.originalUrl}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-5 py-3 font-semibold text-[#18181B] dark:text-white">
                            {item.clicks}
                          </td>
                          <td className="px-5 py-3 text-xs text-[#71717A] dark:text-zinc-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              to={`/analytics/${item.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E4E4E7] px-2.5 py-1 text-xs font-semibold text-[#18181B] hover:bg-[#F4F4F5] dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              Details
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#E4E4E7] bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-[#E4E4E7] px-6 py-4 dark:border-zinc-800">
                <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                  Recent Click Activity
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F4F4F5] text-xs uppercase tracking-wider text-[#71717A] dark:bg-zinc-950/60 dark:text-zinc-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Link</th>
                      <th className="px-5 py-3 font-semibold">Referrer</th>
                      <th className="px-5 py-3 font-semibold">Device</th>
                      <th className="px-5 py-3 font-semibold">Region</th>
                      <th className="px-5 py-3 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] dark:divide-zinc-800">
                    {data.recentActivity.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#71717A] dark:text-zinc-400">
                          No recent clicks recorded.
                        </td>
                      </tr>
                    ) : (
                      data.recentActivity.map((event) => (
                        <tr key={event.id} className="hover:bg-[#F4F4F5]/60 dark:hover:bg-zinc-800/40">
                          <td className="px-5 py-3 font-mono text-xs font-semibold text-[#18181B] dark:text-[#E9FFDB]">
                            <Link to={`/analytics/${event.linkId}`} className="hover:underline">
                              /{event.slug}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-xs text-[#18181B] dark:text-zinc-200">{event.referrer}</td>
                          <td className="px-5 py-3 text-xs text-[#71717A] dark:text-zinc-400">{event.deviceType}</td>
                          <td className="px-5 py-3 text-xs text-[#71717A] dark:text-zinc-400">{event.region}</td>
                          <td className="px-5 py-3 text-xs text-[#71717A] dark:text-zinc-400">
                            {new Date(event.clickedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

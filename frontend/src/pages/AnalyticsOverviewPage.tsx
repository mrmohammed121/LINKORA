import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import type { OverviewAnalyticsResponse } from '../types';

type DatePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

function presetFromIso(preset: DatePreset, customFrom: string): string | undefined {
  if (preset === 'all') return undefined;
  if (preset === 'custom') return customFrom ? new Date(customFrom).toISOString() : undefined;
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function AnalyticsOverviewPage() {
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [granularity, setGranularity] = useState<'day' | 'hour'>('day');

  const [data, setData] = useState<OverviewAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const from = presetFromIso(preset, customFrom);
      const to = preset === 'custom' && customTo ? customTo : undefined;
      const res = await api.analytics.overview({ granularity, from, to });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace analytics');
    } finally {
      setIsLoading(false);
    }
  }, [preset, customFrom, customTo, granularity]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Date-Range Controls inspired by Reference Screenshot 4 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated click performance, top-performing links, referrers, and visitor history
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {(['7d', '30d', '90d', 'all', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase transition ${
                    preset === p
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-transparent text-xs focus:outline-none"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-transparent text-xs focus:outline-none"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {isLoading && !data ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
            <span className="text-sm text-slate-500">Aggregating workspace analytics...</span>
          </div>
        ) : data ? (
          <>
            {/* 3 Insight Cards (real data, inspired by Screenshot 4) */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Globe className="h-4 w-4 text-blue-600" />
                  Channel
                </div>
                <p className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                  {data.insights.topChannel
                    ? `Top traffic came from ${data.insights.topChannel.referrer} (${data.insights.topChannel.count} clicks).`
                    : 'No referrer traffic recorded in this range yet.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Link2 className="h-4 w-4 text-teal-600" />
                  Top Link
                </div>
                <p className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                  {data.insights.topLink
                    ? `/${data.insights.topLink.slug} leads with ${data.insights.topLink.clicks.toLocaleString()} total clicks.`
                    : 'Create and share links to unlock top link insights.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Peak Engagement
                </div>
                <p className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                  {data.insights.peakEngagement
                    ? `Peak volume reached ${data.insights.peakEngagement.clicks} clicks on ${data.insights.peakEngagement.label}.`
                    : 'Waiting for click events to determine peak activity.'}
                </p>
              </div>
            </section>

            {/* KPI Totals */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total Clicks &amp; Scans</span>
                  <MousePointerClick className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold">
                  {data.summary.totalClicks.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Unique Visitors</span>
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold">
                  {data.summary.uniqueVisitors.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total Links</span>
                  <Link2 className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold">{data.summary.totalLinks}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Active vs Expired</span>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold">
                  {data.summary.activeLinks}{' '}
                  <span className="text-sm font-medium text-slate-400">
                    / {data.summary.expiredLinks} exp
                  </span>
                </div>
              </div>
            </section>

            {/* Click Performance AreaChart */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Click &amp; Scan Performance Over Time
                  </h2>
                  <p className="text-xs text-slate-500">Real-time aggregated events</p>
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  {(['day', 'hour'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranularity(g)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold capitalize ${
                        granularity === g
                          ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-950 dark:text-blue-400'
                          : 'text-slate-500'
                      }`}
                    >
                      By {g}
                    </button>
                  ))}
                </div>
              </div>

              {data.clicksOverTime.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                  No click events recorded in the selected date range.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.clicksOverTime}
                      margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="overviewArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
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
                        fill="url(#overviewArea)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Devices & Referrers */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                  Device Breakdown
                </h3>
                {data.devices.length === 0 ? (
                  <p className="py-12 text-center text-xs text-slate-500">No device data yet.</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.devices}
                        margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                        <XAxis dataKey="deviceType" tick={{ fontSize: 12 }} stroke="#64748b" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '10px',
                            color: '#f8fafc',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" fill="#0d9488" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                  Top Referrers
                </h3>
                {data.referrers.length === 0 ? (
                  <p className="py-12 text-center text-xs text-slate-500">
                    No referrer data yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.referrers.map((item) => {
                      const pct =
                        data.summary.totalClicks > 0
                          ? Math.round((item.count / data.summary.totalClicks) * 100)
                          : 0;
                      return (
                        <div key={item.referrer} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="truncate">{item.referrer}</span>
                            <span className="text-slate-500">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Top-Performing Links Table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                Top-Performing Links
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                    <tr>
                      <th className="pb-3 font-semibold">Short Link</th>
                      <th className="pb-3 font-semibold">Destination</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Clicks</th>
                      <th className="pb-3 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.topLinks.map((link) => (
                      <tr key={link.id}>
                        <td className="py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            /{link.slug}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="max-w-xs truncate py-3 text-slate-600 dark:text-slate-300">
                          {link.originalUrl}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={link.status} />
                        </td>
                        <td className="py-3 text-right font-bold">
                          {link.clicks.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            to={`/analytics/${link.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Inspect <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent Visitor Click History */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                Recent Visitor Click History
              </h3>
              {data.recentActivity.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No visitor clicks recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                      <tr>
                        <th className="pb-2.5 font-semibold">Timestamp</th>
                        <th className="pb-2.5 font-semibold">Slug</th>
                        <th className="pb-2.5 font-semibold">Device</th>
                        <th className="pb-2.5 font-semibold">Referrer</th>
                        <th className="pb-2.5 font-semibold">Region</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.recentActivity.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 font-mono text-slate-600 dark:text-slate-300">
                            {new Date(item.clickedAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                            <Link to={`/analytics/${item.linkId}`} className="hover:underline">
                              /{item.slug}
                            </Link>
                          </td>
                          <td className="py-2.5 font-medium">{item.deviceType}</td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">
                            {item.referrer}
                          </td>
                          <td className="py-2.5 text-slate-500">{item.region}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

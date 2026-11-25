import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Laptop,
  LifeBuoy,
  Loader2,
  MousePointerClick,
  QrCode,
  RefreshCw,
  ShieldCheck,
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
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import type { AnalyticsResponse, LinkItem } from '../types';

type DatePreset = '7d' | '30d' | '90d' | 'all';

function getFromIso(preset: DatePreset): string | undefined {
  if (preset === 'all') return undefined;
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();

  const [preset, setPreset] = useState<DatePreset>('all');
  const [granularity, setGranularity] = useState<'day' | 'hour'>('day');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [linkItem, setLinkItem] = useState<LinkItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showQrModal, setShowQrModal] = useState(false);
  const [showRescueModal, setShowRescueModal] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [analyticsRes, linkRes] = await Promise.all([
        api.analytics.get(id, { granularity, from: getFromIso(preset) }),
        api.links.get(id),
      ]);
      setData(analyticsRes);
      setLinkItem(linkRes.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [id, granularity, preset]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const topDevice = data?.devices[0]?.deviceType ?? '—';
  const topReferrer = data?.referrers[0]?.referrer ?? '—';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/analytics"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            All Analytics
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {(['7d', '30d', '90d', 'all'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase ${
                    preset === p
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {linkItem && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setShowRescueModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  <LifeBuoy className="h-4 w-4" />
                  QR Rescue
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => void loadAnalytics()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading && !data ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
            <span className="text-sm text-slate-500">Loading link analytics...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        ) : data ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={data.link.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-lg font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  {data.link.shortUrl}
                  <ExternalLink className="h-4 w-4" />
                </a>
                <StatusBadge status={data.link.status} />
              </div>
              <p className="mt-1.5 break-all text-sm text-slate-600 dark:text-slate-300">
                Destination: {data.link.originalUrl}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Privacy-preserving telemetry: IPs are SHA-256 hashed with a daily salt before
                storage.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total Clicks</span>
                  <MousePointerClick className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold">
                  {data.totalClicks.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Unique Visitors</span>
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold">
                  {data.uniqueVisitors.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Top Device</span>
                  <Laptop className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 truncate text-2xl font-extrabold">{topDevice}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Top Referrer</span>
                  <Globe className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-2 truncate text-2xl font-extrabold">{topReferrer}</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Click Volume Over Time
                  </h2>
                  <p className="text-xs text-slate-500">
                    Processed asynchronously without blocking HTTP 302 redirects
                  </p>
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
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  No click events recorded yet. Open QR Code and click &ldquo;Test Live
                  Redirect&rdquo;.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.clicksOverTime}
                      margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#clicksGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

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
                  <p className="py-12 text-center text-xs text-slate-500">No referrer data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.referrers.map((item) => {
                      const pct =
                        data.totalClicks > 0
                          ? Math.round((item.count / data.totalClicks) * 100)
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

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                Click History &amp; Visitor Telemetry
              </h3>
              {data.recentClicks.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">No clicks recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                      <tr>
                        <th className="pb-2.5 font-semibold">Timestamp</th>
                        <th className="pb-2.5 font-semibold">Device</th>
                        <th className="pb-2.5 font-semibold">Referrer</th>
                        <th className="pb-2.5 font-semibold">Region</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.recentClicks.map((click) => (
                        <tr key={click.id}>
                          <td className="py-2.5 font-mono text-slate-600 dark:text-slate-300">
                            {new Date(click.clickedAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 font-medium">{click.deviceType}</td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">
                            {click.referrer}
                          </td>
                          <td className="py-2.5 text-slate-500">{click.region}</td>
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

      <QrCodeModal
        link={showQrModal ? linkItem : null}
        onClose={() => {
          setShowQrModal(false);
          void loadAnalytics();
        }}
      />
      <QrRescueModal
        link={showRescueModal ? linkItem : null}
        onClose={() => setShowRescueModal(false)}
        onSaved={() => void loadAnalytics()}
      />
    </AppLayout>
  );
}

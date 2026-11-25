import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Check,
  Copy,
  CornerDownRight,
  ExternalLink,
  Globe,
  LifeBuoy,
  Loader2,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { StatusBadge } from '../components/StatusBadge';
import { useLinkStore } from '../store/useLinkStore';
import type { LinkItem, LinkStatus } from '../types';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Parses a date filter value to epoch ms; returns null when the value is
 * empty or unparseable so the filter simply doesn't apply instead of
 * comparing against NaN (which hides every link).
 */
function parseDateMs(value: string | undefined, endOfDay = false): number | null {
  if (!value) return null;
  const date = endOfDay ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function MyLinksPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const { links, isLoading, error, fetchLinks, deleteLink } = useLinkStore();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<'ALL' | LinkStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [rescueModalLink, setRescueModalLink] = useState<LinkItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rescueToast, setRescueToast] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fromMs = parseDateMs(dateFrom);
    const toMs = parseDateMs(dateTo, true);

    return links.filter((link) => {
      const matchesStatus = statusFilter === 'ALL' || link.status === statusFilter;
      const matchesQuery =
        !q ||
        link.slug.toLowerCase().includes(q) ||
        link.originalUrl.toLowerCase().includes(q) ||
        link.shortUrl.toLowerCase().includes(q);

      const createdMs = new Date(link.createdAt).getTime();
      const matchesFrom = fromMs === null || createdMs >= fromMs;
      const matchesTo = toMs === null || createdMs <= toMs;

      return matchesStatus && matchesQuery && matchesFrom && matchesTo;
    });
  }, [links, searchQuery, statusFilter, dateFrom, dateTo]);

  const handleCopy = async (link: LinkItem) => {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleDelete = async (link: LinkItem) => {
    if (
      !window.confirm(
        `Delete "/${link.slug}" permanently? Its QR code and click history will be removed.`
      )
    ) {
      return;
    }
    setDeletingId(link.id);
    try {
      await deleteLink(link.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header Row inspired by Reference Screenshot 2 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              My Links
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredLinks.length} of {links.length} links shown
            </p>
          </div>

          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create link
          </Link>
        </div>

        {/* Search & Date/Status Filter Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search links by slug or destination..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Created from date"
                className="bg-transparent text-xs text-slate-700 focus:outline-none dark:text-slate-300"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Created to date"
                className="bg-transparent text-xs text-slate-700 focus:outline-none dark:text-slate-300"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | LinkStatus)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="ALL">Show: All</option>
              <option value="ACTIVE">Show: Active</option>
              <option value="EXPIRED">Show: Expired</option>
              <option value="DISABLED">Show: Disabled</option>
            </select>
          </div>
        </div>

        {rescueToast && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              {rescueToast}
            </span>
            <button
              type="button"
              onClick={() => setRescueToast(null)}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {isLoading && links.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-slate-500">Loading links...</span>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No links match your current filters
            </p>
            <Link
              to="/create"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Create your next short link
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((link, index) => (
              <div key={link.id} className="space-y-3">
                <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 sm:flex">
                      <Globe className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {getHostname(link.originalUrl)} — /{link.slug}
                        </h3>
                        <StatusBadge status={link.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={link.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {link.shortUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleCopy(link)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {copiedId === link.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{link.originalUrl}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <BarChart3 className="h-3 w-3 text-blue-500" />
                          {link.clickCount.toLocaleString()} clicks
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(link.createdAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            link.isCached ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'
                          }`}
                        >
                          <Zap className="h-3 w-3" />
                          {link.isCached ? 'Cached' : 'DB Fallback'}
                        </span>
                        {link.expiresAt && (
                          <span>Expires {new Date(link.expiresAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                    <button
                      type="button"
                      onClick={() => setRescueModalLink(link)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      <LifeBuoy className="h-3.5 w-3.5" />
                      Edit / Rescue
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrModalLink(link)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      QR Code
                    </button>
                    <Link
                      to={`/analytics/${link.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Analytics
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(link)}
                      disabled={deletingId === link.id}
                      aria-label={`Delete ${link.slug}`}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:bg-rose-500/10"
                    >
                      {deletingId === link.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </article>

                {index === 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/75 px-4 py-2.5 text-xs font-medium text-teal-800 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-200">
                    <Sparkles className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                    Change any link&apos;s destination or reactivate expired links anytime with QR
                    Rescue—existing printed QR codes continue working seamlessly.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <QrCodeModal link={qrModalLink} onClose={() => setQrModalLink(null)} />
      <QrRescueModal
        link={rescueModalLink}
        onClose={() => setRescueModalLink(null)}
        onSaved={(updated) =>
          setRescueToast(
            `QR Rescue saved: /${updated.slug} now redirects live to ${updated.originalUrl} without reprinting.`
          )
        }
      />
    </AppLayout>
  );
}

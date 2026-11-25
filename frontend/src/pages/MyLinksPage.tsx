import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Link2,
  PlusCircle,
  QrCode,
  Search,
  Trash2
} from 'lucide-react';
import { useLinkStore } from '../store/useLinkStore';
import { useAuthStore } from '../store/useAuthStore';
import { LinkItem, LinkStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

function parseDateMs(value: string, endOfDay = false): number | null {
  if (!value) return null;
  const parsed = new Date(endOfDay ? `${value}T23:59:59` : `${value}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function MyLinksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<'ALL' | LinkStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<LinkItem | null>(null);
  const [rescueLink, setRescueLink] = useState<LinkItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { links, isLoading, error, fetchLinks, deleteLink } = useLinkStore();

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const filteredLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromMs = parseDateMs(dateFrom, false);
    const toMs = parseDateMs(dateTo, true);

    return links.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (q) {
        const hay = `${item.slug} ${item.originalUrl} ${item.shortUrl}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const createdMs = new Date(item.createdAt).getTime();
      if (fromMs !== null && createdMs < fromMs) return false;
      if (toMs !== null && createdMs > toMs) return false;
      return true;
    });
  }, [links, query, statusFilter, dateFrom, dateTo]);

  const handleCopy = async (link: LinkItem) => {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLink(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#18181B] dark:text-white">My Links</h1>
          <p className="mt-1 text-sm text-[#71717A] dark:text-zinc-400">
            {user
              ? 'Search, copy, filter, inspect analytics, or generate QR codes for all your shortened links.'
              : 'Viewing your guest browser links. Create an account anytime to sync across devices.'}
          </p>
        </div>

        <RouterLink
          to="/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E9FFDB] px-4 py-2.5 text-sm font-semibold text-[#18181B] shadow-soft transition hover:bg-[#D7F9C2]"
        >
          <PlusCircle className="h-4 w-4" />
          Create Short Link
        </RouterLink>
      </div>

      <section className="rounded-3xl border border-[#E4E4E7] bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                if (value.trim()) {
                  setSearchParams({ q: value });
                } else {
                  setSearchParams({});
                }
              }}
              placeholder="Search by slug, destination URL, or short link..."
              className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] py-2.5 pl-10 pr-4 text-sm text-[#18181B] outline-none transition focus:border-[#27272A] focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-[#E9FFDB]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'ACTIVE', 'EXPIRED', 'DISABLED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-[#27272A] text-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]'
                    : 'border border-[#E4E4E7] bg-white text-[#71717A] hover:text-[#18181B] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#E4E4E7] pt-3 dark:border-zinc-800">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] dark:text-zinc-400">
            <Calendar className="h-3.5 w-3.5" />
            Created between:
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] px-2.5 py-1.5 text-xs text-[#18181B] outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          />
          <span className="text-xs text-[#71717A]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] px-2.5 py-1.5 text-xs text-[#18181B] outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          />
          {(dateFrom || dateTo || query || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatusFilter('ALL');
                setDateFrom('');
                setDateTo('');
                setSearchParams({});
              }}
              className="text-xs font-semibold text-[#18181B] underline dark:text-[#E9FFDB]"
            >
              Reset filters
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      {isLoading && links.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-[#E4E4E7] bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#E4E4E7] bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#27272A] text-[#E9FFDB]">
            <Link2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-[#18181B] dark:text-white">
            No matching links found
          </h2>
          <p className="mt-1 text-sm text-[#71717A] dark:text-zinc-400">
            Try clearing your search filters or create a brand-new short URL.
          </p>
          <RouterLink
            to="/create"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#E9FFDB] px-4 py-2 text-sm font-semibold text-[#18181B] hover:bg-[#D7F9C2]"
          >
            <PlusCircle className="h-4 w-4" />
            Create Short Link
          </RouterLink>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLinks.map((link) => (
            <article
              key={link.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E4E4E7] bg-white p-5 transition hover:border-[#27272A]/40 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 lg:flex-row lg:items-center"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#18181B] dark:text-[#E9FFDB]">
                    /{link.slug}
                  </span>
                  <StatusBadge status={link.status} />
                  {link.isCached && (
                    <span className="rounded-full bg-[#F4F4F5] px-2.5 py-0.5 text-[11px] font-medium text-[#71717A] dark:bg-zinc-800 dark:text-zinc-300">
                      Cached
                    </span>
                  )}
                  <span className="rounded-full bg-[#27272A] px-2.5 py-0.5 text-[11px] font-semibold text-[#E9FFDB]">
                    {link.clickCount} clicks
                  </span>
                </div>

                <a
                  href={link.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-[#2563EB] hover:underline dark:text-blue-400"
                >
                  {link.shortUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>

                <p className="truncate text-xs text-[#71717A] dark:text-zinc-400" title={link.originalUrl}>
                  {link.originalUrl}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#71717A] dark:text-zinc-400">
                  <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
                  {link.expiresAt && (
                    <span>
                      Expires {new Date(link.expiresAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy(link)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#27272A] px-3 py-2 text-xs font-semibold text-[#E9FFDB] transition hover:bg-[#3F3F46]"
                >
                  {copiedId === link.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === link.id ? 'Copied' : 'Copy'}
                </button>

                <button
                  type="button"
                  onClick={() => setQrLink(link)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR Code
                </button>

                <button
                  type="button"
                  onClick={() => setRescueLink(link)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>

                <RouterLink
                  to={`/analytics/${link.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Analytics
                </RouterLink>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(link)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/10 px-3 py-2 text-xs font-semibold text-[#DC2626] transition hover:bg-[#DC2626]/15"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {qrLink && <QrCodeModal link={qrLink} onClose={() => setQrLink(null)} />}
      {rescueLink && (
        <QrRescueModal
          link={rescueLink}
          onClose={() => {
            setRescueLink(null);
            void fetchLinks();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete /${deleteTarget?.slug ?? ''}?`}
        description="This permanently removes the short link and its click analytics. Any printed QR code pointing to this slug will stop resolving."
        confirmLabel="Delete Link"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}

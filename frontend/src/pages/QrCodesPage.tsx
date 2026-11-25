import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CornerDownRight,
  Download,
  ExternalLink,
  LifeBuoy,
  Link2,
  Loader2,
  Plus,
  QrCode,
  Search,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { QrThumbnail } from '../components/QrThumbnail';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { useLinkStore } from '../store/useLinkStore';
import type { LinkItem, LinkStatus } from '../types';

export function QrCodesPage() {
  const { links, isLoading, fetchLinks } = useLinkStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LinkStatus>('ALL');
  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [rescueModalLink, setRescueModalLink] = useState<LinkItem | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return links.filter((link) => {
      const matchesStatus = statusFilter === 'ALL' || link.status === statusFilter;
      const matchesQuery =
        !q ||
        link.slug.toLowerCase().includes(q) ||
        link.originalUrl.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [links, searchQuery, statusFilter]);

  const handleDownload = async (link: LinkItem, format: 'png' | 'svg') => {
    const key = `${link.id}:${format}`;
    setDownloadingKey(key);
    try {
      await api.qr.downloadFile(link.id, link.slug, format);
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header Row inspired by Reference Screenshot 3 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              QR Codes
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Every QR code encodes your permanent short URL so you can swap destinations live
              without reprinting.
            </p>
          </div>

          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create code
          </Link>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search QR codes by slug or destination..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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

        {isLoading && links.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-slate-500">Loading dynamic QR codes...</span>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <QrCode className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              No QR codes found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((link) => (
              <article
                key={link.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <button
                    type="button"
                    onClick={() => setQrModalLink(link)}
                    className="shrink-0 transition-transform hover:scale-105"
                    title="Open large QR preview"
                  >
                    <QrThumbnail linkId={link.id} sizeClass="h-24 w-24" />
                  </button>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Dynamic QR
                      </span>
                      <StatusBadge status={link.status} />
                    </div>

                    <h3 className="font-mono text-base font-bold text-slate-900 dark:text-white">
                      /{link.slug}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{link.originalUrl}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {link.clickCount.toLocaleString()} scans
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(link.createdAt).toLocaleDateString()}
                      </span>
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Link2 className="h-3 w-3" />
                        {link.shortUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                  <button
                    type="button"
                    onClick={() => setRescueModalLink(link)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  >
                    <LifeBuoy className="h-3.5 w-3.5" />
                    Edit Destination
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDownload(link, 'png')}
                    disabled={downloadingKey === `${link.id}:png`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PNG
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDownload(link, 'svg')}
                    disabled={downloadingKey === `${link.id}:svg`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    SVG
                  </button>

                  <Link
                    to={`/analytics/${link.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Analytics
                  </Link>
                </div>
              </article>
            ))}

            <div className="py-4 text-center text-xs text-slate-400">
              — End of your dynamic QR codes —
            </div>
          </div>
        )}
      </div>

      <QrCodeModal link={qrModalLink} onClose={() => setQrModalLink(null)} />
      <QrRescueModal link={rescueModalLink} onClose={() => setRescueModalLink(null)} />
    </AppLayout>
  );
}

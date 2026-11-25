import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  CornerDownRight,
  Download,
  ExternalLink,
  LifeBuoy,
  Link2,
  Loader2,
  Palette,
  Plus,
  QrCode,
  Search,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { QrThumbnail } from '../components/QrThumbnail';
import { StatusBadge } from '../components/StatusBadge';
import { DEFAULT_QR_STYLE, exportStyledQr } from '../lib/qrStyle';
import { useLinkStore } from '../store/useLinkStore';
import type { LinkItem, LinkStatus } from '../types';

export function QrCodesPage() {
  const { links, isLoading, fetchLinks } = useLinkStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LinkStatus>('ALL');
  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [rescueModalLink, setRescueModalLink] = useState<LinkItem | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [rescueToast, setRescueToast] = useState<string | null>(null);

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
      await exportStyledQr(
        link.shortUrl,
        link.slug,
        link.qrStyleConfig ?? DEFAULT_QR_STYLE,
        format
      );
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B] dark:text-white">
              QR Code Studio
            </h1>
            <p className="text-xs text-[#71717A] dark:text-zinc-400">
              Preview, customize colors &amp; dot patterns, download PNG/SVG, and swap targets live.
            </p>
          </div>

          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E9FFDB] px-4 py-2.5 text-xs font-bold text-[#18181B] shadow-xs transition hover:bg-[#D7F9C2]"
          >
            <Plus className="h-4 w-4" />
            Create Short Link
          </Link>
        </div>

        {rescueToast && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3 text-xs font-medium text-[#16A34A]">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
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

        {/* Search & Status Filter */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-xs dark:border-[#3F3F46] dark:bg-[#27272A] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search QR codes by slug or destination..."
              className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] py-2 pl-9 pr-3 text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#27272A] focus:bg-white focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | LinkStatus)}
            className="rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-3 py-2 text-xs font-semibold text-[#18181B] focus:border-[#27272A] focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
          >
            <option value="ALL">Show: All</option>
            <option value="ACTIVE">Show: Active</option>
            <option value="EXPIRED">Show: Expired</option>
            <option value="DISABLED">Show: Disabled</option>
          </select>
        </div>

        {isLoading && links.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-[#E4E4E7] bg-white py-16 dark:border-[#3F3F46] dark:bg-[#27272A]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#27272A] dark:text-[#E9FFDB]" />
            <span className="text-sm text-[#71717A]">Loading dynamic QR codes...</span>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="rounded-2xl border border-[#E4E4E7] bg-white py-16 text-center dark:border-[#3F3F46] dark:bg-[#27272A]">
            <QrCode className="mx-auto h-10 w-10 text-[#71717A]" />
            <p className="mt-3 text-sm font-semibold text-[#18181B] dark:text-zinc-200">
              No QR codes found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((link) => (
              <article
                key={link.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-xs transition hover:border-[#27272A] dark:border-[#3F3F46] dark:bg-[#27272A] lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <button
                    type="button"
                    onClick={() => setQrModalLink(link)}
                    className="shrink-0 transition-transform hover:scale-105"
                    title="Open QR Studio & Custom Designer"
                  >
                    <QrThumbnail
                      linkId={link.id}
                      shortUrl={link.shortUrl}
                      slug={link.slug}
                      qrStyleConfig={link.qrStyleConfig}
                      sizeClass="h-24 w-24"
                    />
                  </button>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#27272A] px-2 py-0.5 text-[11px] font-bold text-[#E9FFDB]">
                        Dynamic QR
                      </span>
                      <StatusBadge status={link.status} />
                      {link.qrStyleConfig && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-semibold text-[#18181B] dark:bg-[#18181B] dark:text-[#E9FFDB]">
                          <Palette className="h-3 w-3" />
                          Custom Styled
                        </span>
                      )}
                    </div>

                    <h3 className="font-mono text-base font-bold text-[#18181B] dark:text-white">
                      /{link.slug}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-[#71717A] dark:text-zinc-300">
                      <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{link.originalUrl}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#71717A] dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#F4F4F5] px-2 py-0.5 font-semibold text-[#18181B] dark:bg-[#18181B] dark:text-zinc-200">
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
                        className="inline-flex items-center gap-1 font-mono text-[#18181B] underline decoration-[#E9FFDB] decoration-2 dark:text-white"
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
                    onClick={() => setQrModalLink(link)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#27272A] px-3 py-2 text-xs font-bold text-[#E9FFDB] transition hover:bg-[#3F3F46] dark:bg-[#E9FFDB] dark:text-[#18181B]"
                  >
                    <Palette className="h-3.5 w-3.5" />
                    Customize QR
                  </button>

                  <button
                    type="button"
                    onClick={() => setRescueModalLink(link)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-2 text-xs font-semibold text-[#B45309] transition hover:bg-[#F59E0B]/20 dark:text-[#FBBF24]"
                  >
                    <LifeBuoy className="h-3.5 w-3.5" />
                    Edit Target
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDownload(link, 'png')}
                    disabled={downloadingKey === `${link.id}:png`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PNG
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDownload(link, 'svg')}
                    disabled={downloadingKey === `${link.id}:svg`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    SVG
                  </button>

                  <Link
                    to={`/analytics/${link.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Analytics
                  </Link>
                </div>
              </article>
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
            `/${updated.slug} now redirects live to ${updated.originalUrl} â€” no reprinting needed.`
          )
        }
      />
    </AppLayout>
  );
}

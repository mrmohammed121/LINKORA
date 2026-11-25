import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
  Loader2,
  PauseCircle,
  QrCode,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { StatusBadge } from '../components/StatusBadge';
import { WorkspacePromptCard } from '../components/WorkspacePromptModal';
import { useAuthStore } from '../store/useAuthStore';
import { useLinkStore } from '../store/useLinkStore';
import type { LinkItem, LinkStatus } from '../types';

export function LinkManagementPage() {
  const isAuthenticated = Boolean(useAuthStore((s) => s.token));
  const { links, isLoading, fetchLinks, updateLink, deleteLink } = useLinkStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LinkStatus>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [rescueModalLink, setRescueModalLink] = useState<LinkItem | null>(null);
  const [authPromptFeature, setAuthPromptFeature] = useState<string | null>(null);
  const [rescueToast, setRescueToast] = useState<string | null>(null);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return links.filter((l) => {
      const okStatus = statusFilter === 'ALL' || l.status === statusFilter;
      const okSearch =
        !q || l.slug.toLowerCase().includes(q) || l.originalUrl.toLowerCase().includes(q);
      return okStatus && okSearch;
    });
  }, [links, search, statusFilter]);

  const handleQuickStatus = async (link: LinkItem, nextStatus: LinkStatus) => {
    if (!isAuthenticated) {
      setAuthPromptFeature(`QR Lifecycle Controls (/${link.slug})`);
      return;
    }
    setBusyId(link.id);
    try {
      const updated = await updateLink(link.id, {
        status: nextStatus,
        ...(nextStatus === 'ACTIVE' &&
        link.expiresAt &&
        new Date(link.expiresAt) < new Date()
          ? { expiresAt: null }
          : {}),
      });
      setRescueToast(`Updated /${updated.slug} status to ${updated.status}.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (link: LinkItem) => {
    if (!window.confirm(`Delete "/${link.slug}" permanently?`)) return;
    setBusyId(link.id);
    try {
      await deleteLink(link.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Link Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Activate, pause, reactivate expired links, or hot-swap destinations while preserving
            every printed QR code.
          </p>
        </div>

        {rescueToast && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
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

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter links..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'ACTIVE', 'EXPIRED', 'DISABLED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {isLoading && links.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              Loading link management table...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Slug</th>
                    <th className="px-4 py-3 font-semibold">Destination URL</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Cache</th>
                    <th className="px-4 py-3 font-semibold">Expiration</th>
                    <th className="px-4 py-3 font-semibold text-right">Clicks</th>
                    <th className="px-4 py-3 font-semibold text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((link) => (
                    <tr key={link.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <a
                          href={link.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                          title={link.shortUrl}
                        >
                          /{link.slug}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="mt-0.5 text-[10px] font-normal text-slate-400">
                          {link.shortUrl}
                        </div>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        {link.originalUrl}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={link.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            link.isCached ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'
                          }`}
                        >
                          <Zap className="h-3 w-3" />
                          {link.isCached ? 'Cached' : 'Cold'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {link.expiresAt ? new Date(link.expiresAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {link.clickCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {link.status !== 'ACTIVE' ? (
                            <button
                              type="button"
                              disabled={busyId === link.id}
                              onClick={() => void handleQuickStatus(link, 'ACTIVE')}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === link.id}
                              onClick={() => void handleQuickStatus(link, 'DISABLED')}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <PauseCircle className="h-3 w-3" />
                              Pause
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setRescueModalLink(link)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                          >
                            <LifeBuoy className="h-3 w-3" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setQrModalLink(link)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                            title="View QR"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={busyId === link.id}
                            onClick={() => void handleDelete(link)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700"
                            title="Delete link"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
      {authPromptFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <WorkspacePromptCard
            featureName={authPromptFeature}
            redirectTo="/manage"
            onClose={() => setAuthPromptFeature(null)}
            onSuccess={() => {
              setAuthPromptFeature(null);
              void fetchLinks();
            }}
          />
        </div>
      )}
    </AppLayout>
  );
}

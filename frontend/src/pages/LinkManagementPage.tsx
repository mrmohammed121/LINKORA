import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  BarChart3,
  Check,
  Copy,
  Edit3,
  PauseCircle,
  PlayCircle,
  QrCode,
  Search,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import { useLinkStore } from '../store/useLinkStore';
import { useAuthStore } from '../store/useAuthStore';
import { LinkItem, LinkStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { QrCodeModal } from '../components/QrCodeModal';
import { QrRescueModal } from '../components/QrRescueModal';
import { WorkspacePromptCard } from '../components/WorkspacePromptModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function LinkManagementPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = Boolean(user);
  const { links, isLoading, error, fetchLinks, updateLink, deleteLink } = useLinkStore();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LinkStatus>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<LinkItem | null>(null);
  const [rescueLink, setRescueLink] = useState<LinkItem | null>(null);
  const [authPromptFeature, setAuthPromptFeature] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  const counts = useMemo(() => {
    let active = 0;
    let expired = 0;
    let disabled = 0;
    for (const link of links) {
      if (link.status === 'ACTIVE') active += 1;
      else if (link.status === 'EXPIRED') expired += 1;
      else disabled += 1;
    }
    return { total: links.length, active, expired, disabled };
  }, [links]);

  const filteredLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((link) => {
      if (statusFilter !== 'ALL' && link.status !== statusFilter) return false;
      if (q) {
        return `${link.slug} ${link.originalUrl} ${link.shortUrl}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [links, query, statusFilter]);

  const handleCopy = async (link: LinkItem) => {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleQuickStatus = async (link: LinkItem, nextStatus: LinkStatus) => {
    if (!isAuthenticated) {
      setAuthPromptFeature('Pause, reactivate, and manage link lifecycles');
      return;
    }
    setActionError('');
    try {
      const clearExpired =
        nextStatus === 'ACTIVE' && link.expiresAt && new Date(link.expiresAt) < new Date();
      await updateLink(link.id, {
        status: nextStatus,
        ...(clearExpired ? { expiresAt: null } : {})
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update link status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteLink(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete link.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#27272A] p-6 text-white shadow-soft sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#3F3F46] px-3 py-1 text-xs font-medium text-[#C4F000]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Link Management & QR Rescue
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
              Control Destinations, Expirations & Status
            </h1>
            <p className="mt-1 text-sm text-zinc-300">
              Pause, reactivate, swap destination URLs without changing printed QR codes, or clean up expired links.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#3F3F46]/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-zinc-300">Active</p>
              <p className="mt-1 font-display text-xl font-bold text-[#C4F000]">{counts.active}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#3F3F46]/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-zinc-300">Expired</p>
              <p className="mt-1 font-display text-xl font-bold text-[#F59E0B]">{counts.expired}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#3F3F46]/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-zinc-300">Disabled</p>
              <p className="mt-1 font-display text-xl font-bold text-zinc-200">{counts.disabled}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E4E4E7] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter table by slug or URL..."
            className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] py-2 pl-10 pr-3 text-sm text-[#18181B] outline-none focus:border-[#27272A] focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'ACTIVE', 'EXPIRED', 'DISABLED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === status
                  ? 'bg-[#27272A] text-[#C4F000] dark:bg-[#C4F000] dark:text-[#18181B]'
                  : 'border border-[#E4E4E7] text-[#71717A] hover:text-[#18181B] dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {(error || actionError) && (
        <div className="rounded-2xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          {actionError || error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-[#E4E4E7] bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F4F5] text-xs uppercase tracking-wider text-[#71717A] dark:bg-zinc-950/60 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Short Link</th>
                <th className="px-5 py-3.5 font-semibold">Destination URL</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Expiration</th>
                <th className="px-5 py-3.5 font-semibold">Clicks</th>
                <th className="px-5 py-3.5 text-right font-semibold">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] dark:divide-zinc-800">
              {isLoading && links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#71717A] dark:text-zinc-400">
                    Loading links...
                  </td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#71717A] dark:text-zinc-400">
                    No links match your filter.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => {
                  const isActive = link.status === 'ACTIVE';
                  return (
                    <tr key={link.id} className="hover:bg-[#F4F4F5]/60 dark:hover:bg-zinc-800/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#18181B] dark:text-[#C4F000]">
                            /{link.slug}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopy(link)}
                            className="rounded-md p-1 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] dark:hover:bg-zinc-800 dark:hover:text-white"
                            aria-label="Copy short URL"
                          >
                            {copiedId === link.id ? (
                              <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#71717A] dark:text-zinc-400">
                          {link.isCached ? 'Edge Cached' : 'Direct DB'}
                        </p>
                      </td>

                      <td className="max-w-[260px] px-5 py-4">
                        <p className="truncate text-xs font-medium text-[#18181B] dark:text-zinc-200" title={link.originalUrl}>
                          {link.originalUrl}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={link.status} />
                      </td>

                      <td className="px-5 py-4 text-xs text-[#71717A] dark:text-zinc-400">
                        {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs font-semibold text-[#18181B] dark:text-white">
                        {link.clickCount}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => void handleQuickStatus(link, 'DISABLED')}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1.5 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/20"
                              title="Pause link"
                            >
                              <PauseCircle className="h-3.5 w-3.5" />
                              Pause
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleQuickStatus(link, 'ACTIVE')}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#C4F000] px-2.5 py-1.5 text-xs font-semibold text-[#18181B] hover:bg-[#b2dc00]"
                              title="Reactivate link"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              Reactivate
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (!isAuthenticated) {
                                setAuthPromptFeature('Edit destination URLs and expiration rules');
                                return;
                              }
                              setRescueLink(link);
                            }}
                            className="rounded-lg border border-[#E4E4E7] p-1.5 text-[#18181B] hover:bg-[#F4F4F5] dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            title="Edit target & expiration"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setQrLink(link)}
                            className="rounded-lg border border-[#E4E4E7] p-1.5 text-[#18181B] hover:bg-[#F4F4F5] dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            title="View QR Studio"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </button>

                          <RouterLink
                            to={`/analytics/${link.id}`}
                            className="rounded-lg border border-[#E4E4E7] p-1.5 text-[#18181B] hover:bg-[#F4F4F5] dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            title="Inspect analytics"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                          </RouterLink>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(link)}
                            className="rounded-lg border border-[#DC2626]/25 bg-[#DC2626]/10 p-1.5 text-[#DC2626] hover:bg-[#DC2626]/20"
                            title="Delete link"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

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

      {authPromptFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <WorkspacePromptCard
            featureName={authPromptFeature}
            redirectTo="/manage"
            onClose={() => setAuthPromptFeature(null)}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete /${deleteTarget?.slug ?? ''}?`}
        description="This action permanently deletes the link and its historical click events."
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

import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  QrCode,
  ScanLine,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useLinkStore } from '../store/useLinkStore';
import type { LinkItem } from '../types';
import { StatusBadge } from './StatusBadge';

interface QrCodeModalProps {
  link: LinkItem | null;
  onClose: () => void;
}

export function QrCodeModal({ link, onClose }: QrCodeModalProps) {
  const fetchLinks = useLinkStore((s) => s.fetchLinks);

  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [isLoadingSvg, setIsLoadingSvg] = useState(false);
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    setIsLoadingSvg(true);
    setError(null);
    setSvgMarkup(null);

    api.qr
      .fetchSvgMarkup(link.id)
      .then((markup) => {
        if (!cancelled) setSvgMarkup(markup);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load QR preview');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSvg(false);
      });

    return () => {
      cancelled = true;
    };
  }, [link]);

  if (!link) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = async (format: 'png' | 'svg') => {
    setDownloading(format);
    setError(null);
    try {
      await api.qr.downloadFile(link.id, link.slug, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleSimulateScan = () => {
    setSimulating(true);
    window.open(link.shortUrl, '_blank', 'noopener,noreferrer');
    // Refresh link list shortly after so BullMQ worker telemetry appears in click count
    setTimeout(() => {
      void fetchLinks().finally(() => setSimulating(false));
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dynamic QR Code
              </h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  /{link.slug}
                </span>
                <StatusBadge status={link.status} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
          {isLoadingSvg ? (
            <div className="flex h-56 w-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : svgMarkup ? (
            <div
              className="h-56 w-56 overflow-hidden rounded-xl bg-white p-2 shadow-sm [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-center text-xs text-rose-500">
              {error ?? 'QR preview unavailable'}
            </div>
          )}

          <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
            <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">
              {link.shortUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => void handleDownload('png')}
            disabled={downloading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {downloading === 'png' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PNG
          </button>

          <button
            type="button"
            onClick={() => void handleDownload('svg')}
            disabled={downloading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {downloading === 'svg' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download SVG
          </button>
        </div>

        <button
          type="button"
          onClick={handleSimulateScan}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-cyan-500"
        >
          {simulating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ScanLine className="h-4 w-4" />
          )}
          Test Live Redirect (HTTP 302 + Analytics)
          <ExternalLink className="h-3.5 w-3.5 opacity-80" />
        </button>

        {error && (
          <p className="mt-3 text-center text-xs font-medium text-rose-500">{error}</p>
        )}
      </div>
    </div>
  );
}

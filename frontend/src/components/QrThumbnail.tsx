import { useEffect, useState } from 'react';
import { Loader2, QrCode } from 'lucide-react';
import { api } from '../lib/api';
import type { QrStyleConfig } from '../types';
import { StyledQrPreview } from './StyledQrPreview';

interface QrThumbnailProps {
  linkId: string;
  shortUrl?: string;
  slug?: string;
  qrStyleConfig?: QrStyleConfig | null;
  sizeClass?: string;
}

export function QrThumbnail({
  linkId,
  shortUrl,
  slug,
  qrStyleConfig,
  sizeClass = 'h-20 w-20',
}: QrThumbnailProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(!qrStyleConfig);

  useEffect(() => {
    if (qrStyleConfig && shortUrl && slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.qr
      .fetchSvgMarkup(linkId)
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [linkId, qrStyleConfig, shortUrl, slug]);

  if (qrStyleConfig && shortUrl && slug) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 ${sizeClass}`}
      >
        <StyledQrPreview
          shortUrl={shortUrl}
          slug={slug}
          styleConfig={qrStyleConfig}
          size={84}
          compact
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 ${sizeClass}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      ) : svg ? (
        <div
          className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <QrCode className="h-6 w-6 text-slate-400" />
      )}
    </div>
  );
}

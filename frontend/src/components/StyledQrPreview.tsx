import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { buildQrStylingOptions, DEFAULT_QR_STYLE } from '../lib/qrStyle';
import type { QrStyleConfig } from '../types';

interface StyledQrPreviewProps {
  shortUrl: string;
  slug: string;
  styleConfig?: QrStyleConfig | null;
  size?: number;
  compact?: boolean;
}

export function StyledQrPreview({
  shortUrl,
  slug,
  styleConfig,
  size = 216,
  compact = false,
}: StyledQrPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const style = styleConfig ?? DEFAULT_QR_STYLE;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const qr = new QRCodeStyling(buildQrStylingOptions(shortUrl, style, size, 'svg'));
    qr.append(el);
  }, [shortUrl, style, size]);

  if (style.frameMode === 'branded-card') {
    const accent = style.accentColor || style.foregroundColor;
    const cta = (style.ctaText || 'SCAN ME').trim() || 'SCAN ME';

    return (
      <div
        className="overflow-hidden rounded-2xl border-2 shadow-sm"
        style={{
          borderColor: accent,
          backgroundColor: style.backgroundColor,
          width: compact ? '100%' : `${size + 28}px`,
        }}
      >
        <div
          className="relative flex items-center gap-2 px-3 py-2 text-white"
          style={{ backgroundColor: accent }}
        >
          {style.logoDataUrl && (
            <img
              src={style.logoDataUrl}
              alt=""
              className={`shrink-0 rounded-md bg-white object-cover p-0.5 ${
                compact ? 'h-5 w-5' : 'h-7 w-7'
              }`}
            />
          )}
          <span
            className={`truncate font-mono font-extrabold ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            /{slug}
          </span>
        </div>

        <div className="flex justify-center p-2">
          <div
            ref={containerRef}
            className="[&>svg]:h-full [&>svg]:w-full"
            style={{ width: size, height: size }}
          />
        </div>

        <div className={compact ? 'px-2 pb-2' : 'px-4 pb-3'}>
          <div
            className={`rounded-lg text-center font-extrabold tracking-wider text-white uppercase ${
              compact ? 'py-0.5 text-[9px]' : 'py-1.5 text-xs'
            }`}
            style={{ backgroundColor: style.foregroundColor }}
          >
            {cta}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center overflow-hidden rounded-xl bg-white [&>svg]:h-full [&>svg]:w-full"
      style={{
        backgroundColor: style.backgroundColor,
        width: size,
        height: size,
      }}
    />
  );
}

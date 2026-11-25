import QRCodeStyling, { type Options as QrStylingOptions } from 'qr-code-styling';
import type { QrStyleConfig } from '../types';

export const DEFAULT_QR_STYLE: QrStyleConfig = {
  dotStyle: 'square',
  cornerStyle: 'square',
  foregroundColor: '#0f172a',
  backgroundColor: '#ffffff',
  accentColor: '#2563eb',
  frameMode: 'none',
  ctaText: 'SCAN ME',
  logoDataUrl: null,
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { r: 15, g: 23, b: 42 };
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return { r: 15, g: 23, b: 42 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function srgbChannelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Adjusts foreground color luminance so QR modules maintain at least a 4.5:1
 * contrast ratio against backgroundColor for reliable mobile camera scanning.
 */
export function ensureScanSafeForeground(
  fgHex: string,
  bgHex = '#ffffff',
  minRatio = 4.5
): string {
  if (getContrastRatio(fgHex, bgHex) >= minRatio) return fgHex;

  const bgLum = relativeLuminance(bgHex);
  const targetDarker = bgLum > 0.4;
  let { r, g, b } = hexToRgb(fgHex);

  for (let i = 0; i < 24; i++) {
    if (targetDarker) {
      r *= 0.86;
      g *= 0.86;
      b *= 0.86;
    } else {
      r = r + (255 - r) * 0.14;
      g = g + (255 - g) * 0.14;
      b = b + (255 - b) * 0.14;
    }
    const candidate = rgbToHex(r, g, b);
    if (getContrastRatio(candidate, bgHex) >= minRatio) {
      return candidate;
    }
  }

  return targetDarker ? '#0f172a' : '#f8fafc';
}

export interface ExtractedImagePalette {
  logoDataUrl: string;
  rawDominant: string;
  foregroundColor: string;
  accentColor: string;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode uploaded image'));
    img.src = src;
  });
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/**
 * Reads an uploaded image file, produces a compact DataURL suitable for DB persistence,
 * and samples pixels via an HTML5 <canvas> to extract dominant & secondary palette colors.
 */
export async function processUploadedQrImage(file: File): Promise<ExtractedImagePalette> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read file'));
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

  const img = await loadImageElement(rawDataUrl);

  // 1. Create compact PNG DataURL (max 220px) for center-logo / banner card persistence
  const maxDim = 220;
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  const outW = Math.max(1, Math.round((img.width || maxDim) * scale));
  const outH = Math.max(1, Math.round((img.height || maxDim) * scale));
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = outW;
  exportCanvas.height = outH;
  const exportCtx = exportCanvas.getContext('2d');
  if (!exportCtx) {
    throw new Error('Canvas 2D context unavailable');
  }
  exportCtx.drawImage(img, 0, 0, outW, outH);
  const logoDataUrl = exportCanvas.toDataURL('image/png');

  // 2. Sample quantized palette on a 64x64 canvas
  const sampleSize = 64;
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  const sampleCtx = sampleCanvas.getContext('2d');
  if (!sampleCtx) {
    return {
      logoDataUrl,
      rawDominant: '#0f172a',
      foregroundColor: '#0f172a',
      accentColor: '#2563eb',
    };
  }
  sampleCtx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const { data } = sampleCtx.getImageData(0, 0, sampleSize, sampleSize);

  const buckets = new Map<
    string,
    { count: number; sumR: number; sumG: number; sumB: number; saturation: number }
  >();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;

    // Skip near-pure white backgrounds so logo subjects drive the palette
    if (r > 240 && g > 240 && b > 240) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const prev = buckets.get(key);
    if (prev) {
      prev.count += 1;
      prev.sumR += r;
      prev.sumG += g;
      prev.sumB += b;
    } else {
      buckets.set(key, { count: 1, sumR: r, sumG: g, sumB: b, saturation });
    }
  }

  const ranked = Array.from(buckets.values())
    .map((b) => ({
      r: Math.round(b.sumR / b.count),
      g: Math.round(b.sumG / b.count),
      b: Math.round(b.sumB / b.count),
      score: b.count * (1 + b.saturation * 1.4),
    }))
    .sort((a, b) => b.score - a.score);

  const primary = ranked[0] ?? { r: 15, g: 23, b: 42 };
  const secondary =
    ranked.find((c) => colorDistance(c, primary) > 55) ?? ranked[1] ?? primary;

  const rawDominant = rgbToHex(primary.r, primary.g, primary.b);
  const rawSecondary = rgbToHex(secondary.r, secondary.g, secondary.b);

  return {
    logoDataUrl,
    rawDominant,
    foregroundColor: ensureScanSafeForeground(rawDominant, '#ffffff', 4.5),
    accentColor: ensureScanSafeForeground(rawSecondary, '#ffffff', 3.5),
  };
}

export function buildQrStylingOptions(
  shortUrl: string,
  style: QrStyleConfig,
  size: number,
  drawType: 'svg' | 'canvas' = 'svg'
): QrStylingOptions {
  const useCenterLogo = style.frameMode === 'center-logo' && Boolean(style.logoDataUrl);
  const cornerColor =
    style.frameMode === 'color-matched' && style.accentColor
      ? style.accentColor
      : style.foregroundColor;

  return {
    width: size,
    height: size,
    type: drawType,
    data: shortUrl,
    margin: 10,
    qrOptions: {
      errorCorrectionLevel: useCenterLogo ? 'H' : 'M',
    },
    dotsOptions: {
      type: style.dotStyle,
      color: style.foregroundColor,
    },
    cornersSquareOptions: {
      type: style.cornerStyle,
      color: cornerColor,
    },
    cornersDotOptions: {
      type: style.cornerStyle === 'dot' ? 'dot' : 'square',
      color: style.foregroundColor,
    },
    backgroundOptions: {
      color: style.backgroundColor,
    },
    ...(useCenterLogo && style.logoDataUrl
      ? {
          image: style.logoDataUrl,
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.34,
            margin: 6,
            crossOrigin: 'anonymous',
          },
        }
      : {}),
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Exports a high-resolution (1024px) PNG or scalable SVG of the styled QR code.
 * When `frameMode === 'branded-card'`, wraps the QR inside a branded card with
 * the uploaded banner/watermark and CTA label.
 */
export async function exportStyledQr(
  shortUrl: string,
  slug: string,
  style: QrStyleConfig,
  format: 'png' | 'svg'
): Promise<void> {
  if (style.frameMode !== 'branded-card') {
    const size = format === 'png' ? 1024 : 400;
    const qr = new QRCodeStyling(
      buildQrStylingOptions(shortUrl, style, size, format === 'png' ? 'canvas' : 'svg')
    );
    const rawData = await qr.getRawData(format);
    if (!rawData) throw new Error('Unable to generate QR export');
    const blob =
      rawData instanceof Blob ? rawData : new Blob([new Uint8Array(rawData as unknown as ArrayBuffer)]);
    triggerDownload(blob, `linkora-${slug}.${format}`);
    return;
  }

  const cta = (style.ctaText || 'SCAN ME').trim().toUpperCase();
  const accent = style.accentColor || style.foregroundColor;

  if (format === 'svg') {
    const innerQr = new QRCodeStyling(buildQrStylingOptions(shortUrl, style, 360, 'svg'));
    const rawSvg = await innerQr.getRawData('svg');
    if (!rawSvg) throw new Error('Unable to generate SVG');
    const svgText =
      rawSvg instanceof Blob ? await rawSvg.text() : new TextDecoder().decode(rawSvg as unknown as ArrayBuffer);

    // Extract inner <svg> body so it embeds cleanly inside the card SVG
    const innerContent = svgText
      .replace(/^[\s\S]*?<svg[^>]*>/i, '')
      .replace(/<\/svg>\s*$/i, '');

    const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="440" height="580" viewBox="0 0 440 580">
  <rect width="440" height="580" rx="28" fill="${style.backgroundColor}" stroke="${accent}" stroke-width="4" />
  <rect x="0" y="0" width="440" height="92" rx="28" fill="${accent}" />
  <rect x="0" y="64" width="440" height="28" fill="${accent}" />
  ${
    style.logoDataUrl
      ? `<image href="${style.logoDataUrl}" x="24" y="18" width="56" height="56" preserveAspectRatio="xMidYMid slice" />`
      : ''
  }
  <text x="${style.logoDataUrl ? 96 : 220}" y="53" text-anchor="${
      style.logoDataUrl ? 'start' : 'middle'
    }" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800">/${escapeXml(
      slug
    )}</text>
  <svg x="40" y="114" width="360" height="360" viewBox="0 0 360 360">
    ${innerContent}
  </svg>
  <rect x="70" y="494" width="300" height="52" rx="16" fill="${style.foregroundColor}" />
  <text x="220" y="527" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" letter-spacing="2">${escapeXml(
    cta
  )}</text>
</svg>`;

    triggerDownload(new Blob([cardSvg], { type: 'image/svg+xml;charset=utf-8' }), `linkora-${slug}.svg`);
    return;
  }

  // High-res 1024px wide PNG Branded Card
  const cardW = 1024;
  const cardH = 1320;
  const canvas = document.createElement('canvas');
  canvas.width = cardW;
  canvas.height = cardH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Card background
  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, cardW, cardH);

  // Header banner
  const bannerH = 210;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, cardW, bannerH);

  if (style.logoDataUrl) {
    try {
      const logoImg = await loadImageElement(style.logoDataUrl);
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(logoImg, 0, 0, cardW, bannerH);
      ctx.restore();

      // Crisp square logo badge inside banner
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(56, 40, 130, 130, 24);
      ctx.fill();
      ctx.drawImage(logoImg, 66, 50, 110, 110);
    } catch {
      // ignore image draw errors
    }
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 50px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = style.logoDataUrl ? 'left' : 'center';
  ctx.fillText(`/${slug}`, style.logoDataUrl ? 216 : cardW / 2, bannerH / 2);

  // Inner QR at 820x820
  const qrSize = 820;
  const qr = new QRCodeStyling(buildQrStylingOptions(shortUrl, style, qrSize, 'canvas'));
  const rawPng = await qr.getRawData('png');
  if (!rawPng) throw new Error('Unable to generate QR PNG');
  const qrBlob =
    rawPng instanceof Blob
      ? rawPng
      : new Blob([new Uint8Array(rawPng as unknown as ArrayBuffer)], { type: 'image/png' });
  const qrUrl = URL.createObjectURL(qrBlob);
  try {
    const qrImg = await loadImageElement(qrUrl);
    ctx.drawImage(qrImg, (cardW - qrSize) / 2, 255, qrSize, qrSize);
  } finally {
    URL.revokeObjectURL(qrUrl);
  }

  // Bottom CTA pill
  ctx.fillStyle = style.foregroundColor;
  ctx.beginPath();
  ctx.roundRect(140, 1125, cardW - 280, 120, 32);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 44px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(cta, cardW / 2, 1185);

  const outBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!outBlob) throw new Error('Failed to encode branded card PNG');
  triggerDownload(outBlob, `linkora-${slug}.png`);
}

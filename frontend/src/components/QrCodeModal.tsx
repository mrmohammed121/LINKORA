import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  ImagePlus,
  Loader2,
  Lock,
  Palette,
  QrCode,
  RotateCcw,
  Save,
  ScanLine,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_QR_STYLE,
  ensureScanSafeForeground,
  exportStyledQr,
  getContrastRatio,
  processUploadedQrImage,
} from '../lib/qrStyle';
import { useAuthStore } from '../store/useAuthStore';
import { useLinkStore } from '../store/useLinkStore';
import type {
  LinkItem,
  QrCornerStyle,
  QrDotStyle,
  QrFrameMode,
  QrStyleConfig,
} from '../types';
import { StatusBadge } from './StatusBadge';
import { StyledQrPreview } from './StyledQrPreview';
import { WorkspacePromptCard } from './WorkspacePromptModal';

interface QrCodeModalProps {
  link: LinkItem | null;
  onClose: () => void;
}

const FRAME_MODES: Array<{ id: QrFrameMode; label: string; desc: string }> = [
  {
    id: 'center-logo',
    label: 'Center Logo Badge',
    desc: 'White contrast safe-zone & 30% H error correction',
  },
  {
    id: 'color-matched',
    label: 'Color-Matched Dots',
    desc: 'Styled modules & corners using extracted palette',
  },
  {
    id: 'branded-card',
    label: 'Full-Frame Card',
    desc: 'Downloadable branded banner frame + CTA button',
  },
  {
    id: 'none',
    label: 'Classic Matrix',
    desc: 'Clean high-contrast QR without frame',
  },
];

const DOT_STYLES: Array<{ id: QrDotStyle; label: string }> = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'dots', label: 'Dots' },
  { id: 'classy-rounded', label: 'Classy' },
];

const CORNER_STYLES: Array<{ id: QrCornerStyle; label: string }> = [
  { id: 'square', label: 'Square' },
  { id: 'extra-rounded', label: 'Rounded' },
  { id: 'dot', label: 'Dot' },
];

export function QrCodeModal({ link, onClose }: QrCodeModalProps) {
  const isAuthenticated = Boolean(useAuthStore((s) => s.token));
  const fetchLinks = useLinkStore((s) => s.fetchLinks);
  const saveQrStyle = useLinkStore((s) => s.saveQrStyle);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [styleConfig, setStyleConfig] = useState<QrStyleConfig>(DEFAULT_QR_STYLE);
  const [extractedPalette, setExtractedPalette] = useState<{
    dominant: string;
    accent: string;
  } | null>(null);
  const [showDesigner, setShowDesigner] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!link) return;
    setStyleConfig(
      link.qrStyleConfig ? { ...DEFAULT_QR_STYLE, ...link.qrStyleConfig } : DEFAULT_QR_STYLE
    );
    setShowDesigner(true);
    setExtractedPalette(null);
    setSaveSuccess(null);
    setError(null);
  }, [link]);

  const contrastRatio = useMemo(
    () => getContrastRatio(styleConfig.foregroundColor, styleConfig.backgroundColor),
    [styleConfig.foregroundColor, styleConfig.backgroundColor]
  );

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
      await exportStyledQr(link.shortUrl, link.slug, styleConfig, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleSimulateScan = () => {
    setSimulating(true);
    window.open(link.shortUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      void fetchLinks().finally(() => setSimulating(false));
    }, 900);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const result = await processUploadedQrImage(file);
      setExtractedPalette({
        dominant: result.foregroundColor,
        accent: result.accentColor,
      });
      setStyleConfig((prev) => ({
        ...prev,
        logoDataUrl: result.logoDataUrl,
        foregroundColor: result.foregroundColor,
        accentColor: result.accentColor,
        dotStyle: prev.dotStyle === 'square' ? 'rounded' : prev.dotStyle,
        cornerStyle: prev.cornerStyle === 'square' ? 'extra-rounded' : prev.cornerStyle,
        frameMode: prev.frameMode === 'none' ? 'center-logo' : prev.frameMode,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process uploaded image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveStyle = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    setSavingStyle(true);
    setError(null);
    setSaveSuccess(null);
    try {
      await saveQrStyle(link.id, styleConfig);
      setSaveSuccess('Custom QR style saved to your link!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custom QR style');
    } finally {
      setSavingStyle(false);
    }
  };

  const handleResetStyle = async () => {
    setStyleConfig(DEFAULT_QR_STYLE);
    setExtractedPalette(null);
    setSaveSuccess(null);
    if (isAuthenticated && link.qrStyleConfig) {
      setSavingStyle(true);
      try {
        await saveQrStyle(link.id, null);
        setSaveSuccess('Reverted to classic QR style.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reset QR style');
      } finally {
        setSavingStyle(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#18181B]/75 p-4 backdrop-blur-xs">
      <div
        className={`my-auto w-full rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-2xl dark:border-[#3F3F46] dark:bg-[#27272A] ${
          showDesigner ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#27272A] text-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18181B] dark:text-white">
                QR Code Studio
              </h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-xs text-[#71717A] dark:text-zinc-400">
                  /{link.slug}
                </span>
                <StatusBadge status={link.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDesigner((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                showDesigner
                  ? 'border-[#27272A] bg-[#27272A] text-[#E9FFDB] dark:border-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]'
                  : 'border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#3F3F46] dark:text-white'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              {showDesigner ? 'Compact View' : 'Customise QR'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close QR studio"
              className="rounded-lg p-1.5 text-[#71717A] transition hover:bg-[#F4F4F5] hover:text-[#18181B] dark:hover:bg-[#3F3F46] dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={`mt-5 grid grid-cols-1 gap-6 ${showDesigner ? 'lg:grid-cols-12' : ''}`}>
          {/* Left Preview + Export Column */}
          <div className={showDesigner ? 'lg:col-span-5' : ''}>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-5 dark:border-[#3F3F46] dark:bg-[#18181B]">
              <StyledQrPreview
                shortUrl={link.shortUrl}
                slug={link.slug}
                styleConfig={styleConfig}
                size={216}
              />

              <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 dark:border-[#3F3F46] dark:bg-[#27272A]">
                <span className="truncate font-mono text-xs text-[#18181B] dark:text-zinc-200">
                  {link.shortUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#F4F4F5] px-2.5 py-1 text-xs font-semibold text-[#18181B] transition hover:bg-[#E4E4E7] dark:bg-[#3F3F46] dark:text-white"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => void handleDownload('png')}
                disabled={downloading !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2.5 text-xs font-bold text-[#18181B] transition hover:bg-[#F4F4F5] disabled:opacity-60 dark:border-[#3F3F46] dark:bg-[#3F3F46] dark:text-white"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2.5 text-xs font-bold text-[#18181B] transition hover:bg-[#F4F4F5] disabled:opacity-60 dark:border-[#3F3F46] dark:bg-[#3F3F46] dark:text-white"
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#27272A] px-4 py-2.5 text-xs font-bold text-[#E9FFDB] transition hover:bg-[#3F3F46] dark:bg-[#E9FFDB] dark:text-[#18181B]"
            >
              {simulating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              Test Live Redirect (HTTP 302)
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </button>
          </div>

          {/* Right Custom Designer Panel */}
          {showDesigner && (
            <div className="space-y-4 rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-4 dark:border-[#3F3F46] dark:bg-[#18181B] lg:col-span-7">
              {!isAuthenticated ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center p-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#27272A] text-[#E9FFDB]">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-[#18181B] dark:text-white">
                    Custom QR Designer
                  </h4>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#71717A] dark:text-zinc-400">
                    Sign in to upload a brand logo, extract scan-safe colors, customize dots &amp;
                    frames, and save custom styles to your QR links.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAuthPrompt(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E9FFDB] px-4 py-2.5 text-xs font-bold text-[#18181B] transition hover:bg-[#D7F9C2]"
                  >
                    Sign in to Unlock Custom Designer
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Image Upload & Palette Extraction */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                        1. Brand Image / Logo
                      </span>
                      {styleConfig.logoDataUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setStyleConfig((prev) => ({
                              ...prev,
                              logoDataUrl: null,
                              frameMode: prev.frameMode === 'center-logo' ? 'none' : prev.frameMode,
                            }))
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626] hover:underline"
                        >
                          <Trash2 className="h-3 w-3" /> Remove image
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleImageUpload(e)}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#27272A] bg-white px-4 py-2.5 text-xs font-semibold text-[#18181B] transition hover:bg-[#E4E4E7]/40 dark:border-[#E9FFDB]/50 dark:bg-[#27272A] dark:text-white"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                        {styleConfig.logoDataUrl ? 'Change Image' : 'Upload PNG / JPG / SVG'}
                      </button>

                      {styleConfig.logoDataUrl && (
                        <img
                          src={styleConfig.logoDataUrl}
                          alt="Uploaded brand preview"
                          className="h-10 w-10 rounded-lg border border-[#E4E4E7] bg-white object-contain p-0.5 dark:border-[#3F3F46]"
                        />
                      )}

                      {extractedPalette && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-2.5 py-1.5 text-[11px] dark:border-[#3F3F46] dark:bg-[#27272A]">
                          <span className="text-[#71717A]">Extracted:</span>
                          <span
                            className="h-4 w-4 rounded-full border border-[#E4E4E7]"
                            style={{ backgroundColor: extractedPalette.dominant }}
                            title={`Primary ${extractedPalette.dominant}`}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-[#E4E4E7]"
                            style={{ backgroundColor: extractedPalette.accent }}
                            title={`Accent ${extractedPalette.accent}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Format Presets */}
                  <div>
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      2. Design Mode
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {FRAME_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            setStyleConfig((prev) => ({ ...prev, frameMode: mode.id }))
                          }
                          className={`rounded-xl border p-2.5 text-left transition ${
                            styleConfig.frameMode === mode.id
                              ? 'border-[#27272A] bg-[#27272A] text-white dark:border-[#E9FFDB] dark:bg-[#3F3F46]'
                              : 'border-[#E4E4E7] bg-white text-[#18181B] hover:border-[#71717A] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white'
                          }`}
                        >
                          <div
                            className={`text-xs font-bold ${
                              styleConfig.frameMode === mode.id ? 'text-[#E9FFDB]' : ''
                            }`}
                          >
                            {mode.label}
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] leading-snug ${
                              styleConfig.frameMode === mode.id
                                ? 'text-zinc-300'
                                : 'text-[#71717A] dark:text-zinc-400'
                            }`}
                          >
                            {mode.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Dot & Corner Shapes */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                        Module Dots
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {DOT_STYLES.map((dot) => (
                          <button
                            key={dot.id}
                            type="button"
                            onClick={() =>
                              setStyleConfig((prev) => ({ ...prev, dotStyle: dot.id }))
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                              styleConfig.dotStyle === dot.id
                                ? 'border-[#27272A] bg-[#27272A] text-[#E9FFDB] dark:border-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]'
                                : 'border-[#E4E4E7] bg-white text-[#18181B] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-zinc-300'
                            }`}
                          >
                            {dot.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                        Corner Squares
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {CORNER_STYLES.map((corner) => (
                          <button
                            key={corner.id}
                            type="button"
                            onClick={() =>
                              setStyleConfig((prev) => ({ ...prev, cornerStyle: corner.id }))
                            }
                            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                              styleConfig.cornerStyle === corner.id
                                ? 'border-[#27272A] bg-[#27272A] text-[#E9FFDB] dark:border-[#E9FFDB] dark:bg-[#E9FFDB] dark:text-[#18181B]'
                                : 'border-[#E4E4E7] bg-white text-[#18181B] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-zinc-300'
                            }`}
                          >
                            {corner.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Colors & CTA Label */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold dark:border-[#3F3F46] dark:bg-[#27272A]">
                      <span>QR Color</span>
                      <input
                        type="color"
                        value={styleConfig.foregroundColor}
                        onChange={(e) => {
                          const safeFg = ensureScanSafeForeground(
                            e.target.value,
                            styleConfig.backgroundColor,
                            3.0
                          );
                          setStyleConfig((prev) => ({ ...prev, foregroundColor: safeFg }));
                        }}
                        className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold dark:border-[#3F3F46] dark:bg-[#27272A]">
                      <span>Accent</span>
                      <input
                        type="color"
                        value={styleConfig.accentColor || styleConfig.foregroundColor}
                        onChange={(e) =>
                          setStyleConfig((prev) => ({ ...prev, accentColor: e.target.value }))
                        }
                        className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold dark:border-[#3F3F46] dark:bg-[#27272A]">
                      <span>Background</span>
                      <input
                        type="color"
                        value={styleConfig.backgroundColor}
                        onChange={(e) =>
                          setStyleConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))
                        }
                        className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
                      />
                    </label>
                  </div>

                  {styleConfig.frameMode === 'branded-card' && (
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                        Card Call-to-Action Label
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={styleConfig.ctaText ?? 'SCAN ME'}
                        onChange={(e) =>
                          setStyleConfig((prev) => ({ ...prev, ctaText: e.target.value }))
                        }
                        placeholder="SCAN ME"
                        className="w-full rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#18181B] focus:border-[#27272A] focus:outline-none dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-white"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E4E7] pt-3 dark:border-[#3F3F46]">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                        contrastRatio >= 4.5 ? 'text-[#16A34A]' : 'text-[#F59E0B]'
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Contrast {contrastRatio.toFixed(1)}:1{' '}
                      {contrastRatio >= 4.5 ? '(Scan-Safe)' : '(Low contrast â€” darken QR color)'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleResetStyle()}
                        disabled={savingStyle}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-xs font-semibold text-[#71717A] hover:text-[#18181B] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-zinc-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveStyle()}
                        disabled={savingStyle}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#E9FFDB] px-4 py-2 text-xs font-bold text-[#18181B] transition hover:bg-[#D7F9C2] disabled:opacity-60"
                      >
                        {savingStyle ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save Custom Style
                      </button>
                    </div>
                  </div>

                  {saveSuccess && (
                    <div className="rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/10 px-3 py-2 text-xs font-medium text-[#16A34A]">
                      {saveSuccess}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-center text-xs font-medium text-[#DC2626]">{error}</p>}
      </div>

      {showAuthPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#18181B]/70 p-4 backdrop-blur-xs">
          <WorkspacePromptCard
            featureName="Custom QR Designer"
            redirectTo="/qr-codes"
            onClose={() => setShowAuthPrompt(false)}
            onSuccess={() => {
              setShowAuthPrompt(false);
              void fetchLinks();
            }}
          />
        </div>
      )}
    </div>
  );
}

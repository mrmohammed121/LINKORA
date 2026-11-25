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
    desc: 'Styled modules & corners using extracted image palette',
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
  const [showDesigner, setShowDesigner] = useState(false);
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
    setStyleConfig(link.qrStyleConfig ? { ...DEFAULT_QR_STYLE, ...link.qrStyleConfig } : DEFAULT_QR_STYLE);
    setShowDesigner(Boolean(link.qrStyleConfig));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className={`my-auto w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${
          showDesigner ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dynamic QR Code Studio
              </h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
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
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                showDesigner
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              {showDesigner ? 'Hide Designer' : 'Upload Image / Custom Style'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={`mt-5 grid grid-cols-1 gap-6 ${showDesigner ? 'lg:grid-cols-12' : ''}`}>
          {/* Left Preview + Export Column */}
          <div className={showDesigner ? 'lg:col-span-5' : ''}>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
              <StyledQrPreview
                shortUrl={link.shortUrl}
                slug={link.slug}
                styleConfig={styleConfig}
                size={216}
              />

              <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">
                  {link.shortUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
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
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {downloading === 'png' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                PNG (1024px)
              </button>

              <button
                type="button"
                onClick={() => void handleDownload('svg')}
                disabled={downloading !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
              Test Live Redirect (HTTP 302)
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </button>
          </div>

          {/* Right Custom Image-to-QR Designer Panel */}
          {showDesigner && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60 lg:col-span-7">
              {!isAuthenticated ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center p-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    Image-to-QR Custom Designer
                  </h4>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Sign in to upload a brand logo or image, automatically extract scan-safe colors,
                    embed center badges or branded cards, and save custom styles to your QR links.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAuthPrompt(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                  >
                    Sign in to Unlock Custom Designer
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Image Upload & Palette Extraction */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        1. Upload Brand Image / Logo
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
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
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
                        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-indigo-400 bg-white px-4 py-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-300"
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
                          className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-0.5 dark:border-slate-700"
                        />
                      )}

                      {extractedPalette && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900">
                          <span className="text-slate-500">Extracted:</span>
                          <span
                            className="h-4 w-4 rounded-full border border-slate-300"
                            style={{ backgroundColor: extractedPalette.dominant }}
                            title={`Primary ${extractedPalette.dominant}`}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-slate-300"
                            style={{ backgroundColor: extractedPalette.accent }}
                            title={`Accent ${extractedPalette.accent}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Format Presets */}
                  <div>
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      2. Visual Format Mode
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
                              ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-500/15'
                              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {mode.label}
                          </div>
                          <div className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                            {mode.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Dot & Corner Shapes */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                          >
                            {dot.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
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
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900">
                      <span>Foreground</span>
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

                    <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900">
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

                    <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900">
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
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                        contrastRatio >= 4.5
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Contrast {contrastRatio.toFixed(1)}:1{' '}
                      {contrastRatio >= 4.5 ? '(Scan-Safe)' : '(Low contrast — darken modules)'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleResetStyle()}
                        disabled={savingStyle}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveStyle()}
                        disabled={savingStyle}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-60"
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
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                      {saveSuccess}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-center text-xs font-medium text-rose-500">{error}</p>}
      </div>

      {showAuthPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <WorkspacePromptCard
            featureName="Custom Image-to-QR Designer"
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

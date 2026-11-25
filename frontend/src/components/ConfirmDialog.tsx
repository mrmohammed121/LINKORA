import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete permanently',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/70 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-2xl dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DC2626]/10 text-[#DC2626]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold text-[#18181B] dark:text-white"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close confirmation"
            className="rounded-lg p-1.5 text-[#71717A] transition hover:bg-[#F4F4F5] hover:text-[#18181B] dark:hover:bg-[#3F3F46] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#71717A] dark:text-zinc-300">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-2 text-xs font-semibold text-[#18181B] transition hover:bg-[#F4F4F5] disabled:opacity-60 dark:border-[#3F3F46] dark:bg-[#3F3F46] dark:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

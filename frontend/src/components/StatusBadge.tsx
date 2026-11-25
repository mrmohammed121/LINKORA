import type { LinkStatus } from '../types';

interface StatusBadgeProps {
  status: LinkStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<LinkStatus, string> = {
    ACTIVE:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    EXPIRED:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    DISABLED:
      'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  };

  const dotStyles: Record<LinkStatus, string> = {
    ACTIVE: 'bg-emerald-500 animate-pulse',
    EXPIRED: 'bg-amber-500',
    DISABLED: 'bg-rose-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} />
      {status}
    </span>
  );
}

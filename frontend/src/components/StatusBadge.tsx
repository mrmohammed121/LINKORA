import type { LinkStatus } from '../types';

interface StatusBadgeProps {
  status: LinkStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<LinkStatus, string> = {
    ACTIVE:
      'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25 dark:bg-[#16A34A]/20 dark:text-[#4ADE80]',
    EXPIRED:
      'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/30 dark:bg-[#F59E0B]/20 dark:text-[#FBBF24]',
    DISABLED:
      'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25 dark:bg-[#DC2626]/20 dark:text-[#F87171]',
  };

  const dotStyles: Record<LinkStatus, string> = {
    ACTIVE: 'bg-[#16A34A] animate-pulse',
    EXPIRED: 'bg-[#F59E0B]',
    DISABLED: 'bg-[#DC2626]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} />
      {status}
    </span>
  );
}

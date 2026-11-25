import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, LifeBuoy, QrCode, ShieldOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function RescueFallbackPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const reason = searchParams.get('reason') === 'expired' ? 'expired' : 'not_found';

  const handleRescueClick = () => {
    const safeSlug = encodeURIComponent(slug ?? '');
    navigate(`/dashboard?rescue=${safeSlug}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F4F5] px-4 py-12 text-[#18181B] dark:bg-[#18181B] dark:text-white">
      <div className="w-full max-w-lg rounded-3xl border border-[#E4E4E7] bg-white p-8 text-center shadow-xl dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F59E0B]/15 text-[#F59E0B]">
          {reason === 'expired' ? (
            <Clock className="h-8 w-8" />
          ) : (
            <ShieldOff className="h-8 w-8" />
          )}
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#F4F4F5] px-3 py-1 font-mono text-xs font-semibold text-[#18181B] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-zinc-200">
          <QrCode className="h-3.5 w-3.5 text-[#18181B] dark:text-[#C4F000]" />/{slug}
        </div>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#18181B] dark:text-white">
          {reason === 'expired'
            ? 'This QR Link Has Expired'
            : 'This QR Link Is Paused or Unavailable'}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[#71717A] dark:text-zinc-300">
          {reason === 'expired'
            ? 'The campaign or expiration window for this dynamic QR code has ended, so it is safely parked by LINKORA QR Rescue.'
            : 'This short link is currently paused, disabled, or does not exist. If it was printed on flyers or packaging, the owner can re-route it without reprinting.'}
        </p>

        <div className="mt-6 rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-4 text-left dark:border-[#3F3F46] dark:bg-[#18181B]">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
            <p className="text-xs leading-relaxed text-[#71717A] dark:text-zinc-300">
              <strong className="font-semibold text-[#18181B] dark:text-white">
                QR Rescue Guarantee:
              </strong>{' '}
              Physical QR patterns never need to be reprinted. Once the owner updates the
              destination URL or extends expiry, every scan immediately routes live again.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRescueClick}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C4F000] px-5 py-3 text-sm font-bold text-[#18181B] shadow-xs transition hover:bg-[#d2f833]"
        >
          <LifeBuoy className="h-4 w-4" />
          {token ? 'Rescue This QR Code (Open Dashboard)' : 'Rescue This QR Code (Open Editor)'}
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="mt-5 text-xs text-[#71717A]">
          Powered by{' '}
          <Link
            to="/"
            className="font-bold text-[#18181B] underline decoration-[#C4F000] decoration-2 dark:text-white"
          >
            LINKORA
          </Link>
        </div>
      </div>
    </div>
  );
}

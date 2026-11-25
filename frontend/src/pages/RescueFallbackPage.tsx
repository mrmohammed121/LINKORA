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
    navigate(`/?rescue=${safeSlug}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
          {reason === 'expired' ? (
            <Clock className="h-8 w-8" />
          ) : (
            <ShieldOff className="h-8 w-8" />
          )}
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          <QrCode className="h-3.5 w-3.5 text-indigo-500" />/{slug}
        </div>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {reason === 'expired'
            ? 'This QR Link Has Expired'
            : 'This QR Link Is Paused or Unavailable'}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {reason === 'expired'
            ? 'The campaign or expiration window for this dynamic QR code has ended, so it is temporarily parked safely by LINKORA QR Rescue.'
            : 'This short link is currently paused, disabled, or does not exist. If it was printed on flyers or packaging, the owner can re-route it without reprinting.'}
        </p>

        <div className="mt-6 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-4 text-left">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            <p className="text-xs leading-relaxed text-indigo-900 dark:text-indigo-200">
              <strong className="font-semibold">QR Rescue Guarantee:</strong> Physical QR patterns
              never need to be reprinted. Once the owner updates the destination URL or extends
              expiry, every scan immediately routes live again.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRescueClick}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-cyan-500"
        >
          <LifeBuoy className="h-4 w-4" />
          {token ? 'Rescue This QR Code (Open Dashboard)' : 'Rescue This QR Code (Open Editor)'}
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="mt-5 text-xs text-slate-500 dark:text-slate-400">
          Powered by{' '}
          <Link to="/" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            LINKORA
          </Link>
        </div>
      </div>
    </div>
  );
}

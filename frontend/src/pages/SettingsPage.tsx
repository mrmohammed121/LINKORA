import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Database,
  Loader2,
  Moon,
  Save,
  Shield,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import type { HealthResponse } from '../types';

type SettingsTab = 'profile' | 'security' | 'system' | 'storage';

export function SettingsPage() {
  const { token, user, theme, setTheme, updateProfile } = useAuthStore();
  const isAuthenticated = Boolean(token);

  const [tab, setTab] = useState<SettingsTab>(isAuthenticated ? 'profile' : 'system');
  const [name, setName] = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  useEffect(() => {
    if (!isAuthenticated && (tab === 'profile' || tab === 'security')) {
      setTab('system');
    }
  }, [isAuthenticated, tab]);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    setProfileSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      setProfileMessage('Display name updated successfully.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update display name');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);
    setPwdError(null);
    setPwdSaving(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPwdMessage('Password updated successfully.');
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage your profile preferences, security credentials, appearance, and runtime health.
          </p>
        </div>

        {/* Split Settings Layout inspired by Reference Screenshot 7 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <aside className="space-y-1 md:col-span-3">
            <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isAuthenticated ? 'Personal settings' : 'Workspace settings'}
            </div>
            {(isAuthenticated
              ? ([
                  { id: 'profile', label: 'Profile', icon: UserIcon },
                  { id: 'security', label: 'Security', icon: Shield },
                  { id: 'system', label: 'Appearance & System', icon: Database },
                ] as const)
              : ([
                  { id: 'system', label: 'Appearance & System', icon: Database },
                  { id: 'storage', label: 'Save Data (Optional)', icon: Save },
                ] as const)
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  tab === id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </aside>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:col-span-9">
            {tab === 'storage' && !isAuthenticated && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Save Data to an Account (Optional)
                  </h2>
                  <p className="text-xs text-slate-500">
                    No login is required to shorten links, generate dynamic QR codes, use QR
                    Rescue, or inspect analytics.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Right now your links are tied to this browser session and expire after 24 hours by
                  default. If you want to store your links permanently and access them across
                  devices, sign in or create an account—any links from this session will be saved
                  automatically.
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/login?redirect=/settings"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Sign in to save data
                  </Link>
                  <Link
                    to="/register?redirect=/settings"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            )}

            {tab === 'profile' && isAuthenticated && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile</h2>
                  <p className="text-xs text-slate-500">Preferences and verified account identity</p>
                </div>

                <form onSubmit={handleSaveName} className="max-w-md space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Display name
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  {profileMessage && (
                    <p className="text-xs font-medium text-emerald-600">{profileMessage}</p>
                  )}
                  {profileError && (
                    <p className="text-xs font-medium text-rose-600">{profileError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {profileSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Update display name
                  </button>
                </form>

                <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Email address &amp; Role
                  </h3>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Email</th>
                          <th className="px-4 py-2.5 font-semibold">Status</th>
                          <th className="px-4 py-2.5 font-semibold">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3 font-medium">{user?.email}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold">{user?.role}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'security' && isAuthenticated && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Security</h2>
                  <p className="text-xs text-slate-500">Update your account password</p>
                </div>

                <form onSubmit={handleSavePassword} className="max-w-md space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Current password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      New password (min 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>

                  {pwdMessage && <p className="text-xs font-medium text-emerald-600">{pwdMessage}</p>}
                  {pwdError && <p className="text-xs font-medium text-rose-600">{pwdError}</p>}

                  <button
                    type="submit"
                    disabled={pwdSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {pwdSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Change password
                  </button>
                </form>
              </div>
            )}

            {tab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Appearance &amp; System Diagnostics
                  </h2>
                  <p className="text-xs text-slate-500">
                    Customize theme mode and inspect native backend storage &amp; cache health.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Interface Theme
                  </label>
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                        theme === 'light'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Sun className="h-4 w-4" />
                      Light SaaS
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                        theme === 'dark'
                          ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Moon className="h-4 w-4" />
                      Dark Mode
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Backend Runtime Health
                  </div>
                  {health ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <div className="text-slate-400">API Status</div>
                        <div className="font-semibold text-emerald-600">{health.status}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Database</div>
                        <div className="font-mono font-semibold">{health.database}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Cache Engine</div>
                        <div className="font-mono font-semibold">{health.cacheMode}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Cached Slugs</div>
                        <div className="font-bold">{health.cachedSlugs}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Checking API health...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Database,
  HardDrive,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  Settings2,
  Sun,
  User as UserIcon
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useLinkStore } from '../store/useLinkStore';
import { api } from '../lib/api';
import { HealthResponse } from '../types';

type SettingsTab = 'profile' | 'security' | 'system' | 'appearance';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, theme, setTheme, updateProfile, logout } = useAuthStore();
  const { links, reset: resetLinks } = useLinkStore();
  const isAuthenticated = Boolean(user);

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user]);

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.health();
      setHealth(res);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    void loadHealth();
  }, []);

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    if (!name.trim()) {
      setProfileErr('Display name is required.');
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      setProfileMsg('Profile details saved.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');
    if (!currentPassword || !newPassword) {
      setPasswordErr('Enter your current password and new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordErr('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setPasswordMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordErr(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSignOut = () => {
    resetLinks();
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#27272A] p-6 text-white shadow-soft sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#3F3F46] px-3 py-1 text-xs font-medium text-[#E9FFDB]">
              <Settings2 className="h-3.5 w-3.5" />
              Workspace & Account Settings
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
              Preferences, Security & Diagnostics
            </h1>
            <p className="mt-1 text-sm text-zinc-300">
              Manage your LINKORA account profile, password credentials, display theme, and backend health checks.
            </p>
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#3F3F46] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#DC2626]"
            >
              <LogOut className="h-4 w-4 text-[#E9FFDB]" />
              Log Out
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E9FFDB] px-4 py-2.5 text-xs font-semibold text-[#18181B] hover:bg-[#D7F9C2]"
            >
              Log In to Sync Account
            </Link>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-4">
        <aside className="space-y-1.5 rounded-3xl border border-[#E4E4E7] bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          {(
            [
              { id: 'profile', label: 'Profile & Account', icon: UserIcon },
              { id: 'security', label: 'Password & Security', icon: Lock },
              { id: 'appearance', label: 'Theme & Workspace', icon: Sun },
              { id: 'system', label: 'System Diagnostics', icon: Activity }
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                  active
                    ? 'bg-[#27272A] text-[#E9FFDB]'
                    : 'text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-3">
          {tab === 'profile' && (
            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
              <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                Profile Information
              </h2>
              <p className="mt-1 text-sm text-[#71717A] dark:text-zinc-400">
                Update how your name appears in the LINKORA workspace.
              </p>

              {!isAuthenticated ? (
                <div className="mt-6 rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-5 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-sm font-semibold text-[#18181B] dark:text-white">
                    Currently running in Guest Session mode
                  </p>
                  <p className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">
                    You have {links.length} link(s) in this browser session. Create an account or sign in to keep your links synced permanently.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to="/register"
                      className="rounded-xl bg-[#E9FFDB] px-4 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#D7F9C2]"
                    >
                      Create Account
                    </Link>
                    <Link
                      to="/login"
                      className="rounded-xl bg-[#27272A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3F3F46]"
                    >
                      Log In
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProfileSave} className="mt-6 max-w-lg space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#27272A] focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email ?? ''}
                      disabled
                      className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2.5 text-sm text-[#71717A] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#71717A] dark:text-zinc-400">
                    <span>Role: {user?.role}</span>
                    <span>â€¢</span>
                    <span>Member since {user ? new Date(user.createdAt).toLocaleDateString() : 'â€”'}</span>
                  </div>

                  {profileErr && (
                    <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-3.5 py-2.5 text-xs text-[#DC2626]">
                      {profileErr}
                    </div>
                  )}
                  {profileMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/10 px-3.5 py-2.5 text-xs text-[#16A34A]">
                      <CheckCircle2 className="h-4 w-4" />
                      {profileMsg}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="rounded-xl bg-[#E9FFDB] px-5 py-2.5 text-sm font-semibold text-[#18181B] hover:bg-[#D7F9C2] disabled:opacity-60"
                    >
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E4E7] px-4 py-2.5 text-sm font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 dark:border-zinc-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {tab === 'security' && (
            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
              <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                Password & Security
              </h2>
              <p className="mt-1 text-sm text-[#71717A] dark:text-zinc-400">
                Keep your workspace credentials protected with a strong password.
              </p>

              {!isAuthenticated ? (
                <p className="mt-5 text-sm text-[#71717A] dark:text-zinc-400">
                  Sign in with a registered LINKORA account to manage password settings.
                </p>
              ) : (
                <form onSubmit={handlePasswordSave} className="mt-6 max-w-lg space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#27272A] focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#27272A] focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-zinc-400">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] px-4 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#27272A] focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>

                  {passwordErr && (
                    <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-3.5 py-2.5 text-xs text-[#DC2626]">
                      {passwordErr}
                    </div>
                  )}
                  {passwordMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/10 px-3.5 py-2.5 text-xs text-[#16A34A]">
                      <CheckCircle2 className="h-4 w-4" />
                      {passwordMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="rounded-xl bg-[#27272A] px-5 py-2.5 text-sm font-semibold text-[#E9FFDB] hover:bg-[#3F3F46] disabled:opacity-60"
                  >
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          )}

          {tab === 'appearance' && (
            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
              <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                Appearance & Session Storage
              </h2>
              <p className="mt-1 text-sm text-[#71717A] dark:text-zinc-400">
                Choose your preferred workspace surface contrast.
              </p>

              <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    theme === 'light'
                      ? 'border-[#27272A] bg-[#F4F4F5] ring-2 ring-[#E9FFDB]'
                      : 'border-[#E4E4E7] hover:bg-[#F4F4F5] dark:border-zinc-800 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="rounded-xl bg-white p-2 text-[#18181B] shadow-sm">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#18181B] dark:text-white">Light Surface</p>
                    <p className="mt-0.5 text-xs text-[#71717A] dark:text-zinc-400">
                      Charcoal sidebar + soft zinc workspace
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    theme === 'dark'
                      ? 'border-[#E9FFDB] bg-[#27272A] text-white ring-2 ring-[#E9FFDB]'
                      : 'border-[#E4E4E7] hover:bg-[#F4F4F5] dark:border-zinc-800 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="rounded-xl bg-[#3F3F46] p-2 text-[#E9FFDB]">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Dark Surface</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Deep obsidian cards with Electric Lime highlights
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {tab === 'system' && (
            <div className="rounded-3xl border border-[#E4E4E7] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#18181B] dark:text-white">
                    Backend & Redirect Engine Health
                  </h2>
                  <p className="mt-1 text-sm text-[#71717A] dark:text-zinc-400">
                    Live connectivity report from the LINKORA API.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadHealth()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#27272A] px-3.5 py-2 text-xs font-semibold text-[#E9FFDB] hover:bg-[#3F3F46]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                  Check Now
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#71717A] dark:text-zinc-400">
                    <Activity className="h-4 w-4 text-[#16A34A]" />
                    API Service
                  </div>
                  <p className="mt-2 font-display text-lg font-bold text-[#18181B] dark:text-white">
                    {health?.status ?? 'Checking...'}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#71717A] dark:text-zinc-400">
                    <Database className="h-4 w-4 text-[#2563EB]" />
                    PostgreSQL
                  </div>
                  <p className="mt-2 font-display text-lg font-bold text-[#18181B] dark:text-white">
                    {health?.database ?? 'â€”'}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#71717A] dark:text-zinc-400">
                    <HardDrive className="h-4 w-4 text-[#F59E0B]" />
                    Cache Layer
                  </div>
                  <p className="mt-2 font-display text-lg font-bold text-[#18181B] dark:text-white">
                    {health?.cacheMode ?? 'â€”'}
                  </p>
                  {typeof health?.cachedSlugs === 'number' && (
                    <p className="mt-1 text-xs text-[#71717A] dark:text-zinc-400">
                      {health.cachedSlugs} cached keys
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

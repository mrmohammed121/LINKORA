import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { clearGuestLinks, getGuestSlugs } from '../lib/guestStorage';
import type { User } from '../types';

type ThemeMode = 'dark' | 'light';

interface AuthState {
  token: string | null;
  user: User | null;
  theme: ThemeMode;
  isLoading: boolean;
  error: string | null;
  claimNotice: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (payload: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<User>;
  logout: () => void;
  clearError: () => void;
  clearClaimNotice: () => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  applyTheme: () => void;
}

function syncDocumentTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

async function claimPendingGuestLinks(token: string): Promise<string | null> {
  const slugs = getGuestSlugs();

  try {
    const res = await api.links.claim(slugs, token);
    clearGuestLinks();
    if (res.claimedCount > 0) {
      return res.claimedCount === 1
        ? 'Your link & QR code have been saved to your account!'
        : `${res.claimedCount} links & QR codes have been saved to your account!`;
    }
  } catch {
    // Do not block sign-in if guest link expired or failed to claim
  }
  return null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      theme: 'light',
      isLoading: false,
      error: null,
      claimNotice: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.auth.login({ email, password });
          const notice = await claimPendingGuestLinks(data.token);
          set({
            token: data.token,
            user: data.user,
            isLoading: false,
            error: null,
            claimNotice: notice,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to sign in';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.auth.register({ name, email, password });
          const notice = await claimPendingGuestLinks(data.token);
          set({
            token: data.token,
            user: data.user,
            isLoading: false,
            error: null,
            claimNotice: notice,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to register';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      updateProfile: async (payload) => {
        const data = await api.auth.updateMe(payload);
        set({ user: data.user, token: data.token });
        return data.user;
      },

      logout: () => {
        set({ token: null, user: null, error: null, claimNotice: null });
      },

      clearError: () => set({ error: null }),

      clearClaimNotice: () => set({ claimNotice: null }),

      toggleTheme: () => {
        const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
        syncDocumentTheme(next);
        set({ theme: next });
      },

      setTheme: (theme) => {
        syncDocumentTheme(theme);
        set({ theme });
      },

      applyTheme: () => {
        syncDocumentTheme(get().theme);
      },
    }),
    {
      name: 'linkora-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncDocumentTheme(state.theme);
        }
      },
    }
  )
);

import { create } from 'zustand';
import { api } from '../lib/api';
import { saveGuestLink } from '../lib/guestStorage';
import type { LinkItem, LinkStatus } from '../types';

interface LinkStoreState {
  links: LinkItem[];
  isLoading: boolean;
  error: string | null;
  fetchLinks: () => Promise<void>;
  createLink: (payload: {
    originalUrl: string;
    customSlug?: string;
    expiresAt?: string | null;
  }) => Promise<LinkItem>;
  updateLink: (
    id: string,
    payload: { originalUrl?: string; status?: LinkStatus; expiresAt?: string | null }
  ) => Promise<LinkItem>;
  deleteLink: (id: string) => Promise<void>;
  reset: () => void;
}

export const useLinkStore = create<LinkStoreState>((set) => ({
  links: [],
  isLoading: false,
  error: null,

  fetchLinks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { links } = await api.links.list();
      set({ links, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load links';
      set({ isLoading: false, error: message });
    }
  },

  createLink: async (payload) => {
    const { link } = await api.links.create(payload);
    if (link.isGuest) {
      saveGuestLink(link);
    }
    set((state) => ({ links: [link, ...state.links] }));
    return link;
  },

  updateLink: async (id, payload) => {
    const { link } = await api.links.update(id, payload);
    if (link.isGuest) {
      saveGuestLink(link);
    }
    set((state) => ({
      links: state.links.map((item) => (item.id === id ? link : item)),
    }));
    return link;
  },

  deleteLink: async (id) => {
    await api.links.delete(id);
    set((state) => ({
      links: state.links.filter((item) => item.id !== id),
    }));
  },

  reset: () => set({ links: [], isLoading: false, error: null }),
}));

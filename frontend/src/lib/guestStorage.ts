import type { LinkItem } from '../types';

export const GUEST_ID_KEY = 'linkora_guest_id';
export const GUEST_SLUGS_KEY = 'linkora_guest_slugs';
const GUEST_ITEMS_KEY = 'linkora_guest_items';

function generateGuestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `guest_${crypto.randomUUID()}`;
  }
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,80}$/.test(existing)) {
      return existing;
    }
    const created = generateGuestId();
    localStorage.setItem(GUEST_ID_KEY, created);
    return created;
  } catch {
    return generateGuestId();
  }
}

export function getGuestSlugs(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_SLUGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : [];
  } catch {
    return [];
  }
}

export function getGuestLinks(): LinkItem[] {
  try {
    const raw = localStorage.getItem(GUEST_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LinkItem[]) : [];
  } catch {
    return [];
  }
}

export function saveGuestLink(link: LinkItem): void {
  try {
    const slugs = Array.from(new Set([link.slug, ...getGuestSlugs()]));
    localStorage.setItem(GUEST_SLUGS_KEY, JSON.stringify(slugs));

    const existingItems = getGuestLinks().filter((item) => item.slug !== link.slug);
    localStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify([link, ...existingItems].slice(0, 10)));
  } catch {
    // ignore storage errors
  }
}

export function clearGuestLinks(): void {
  try {
    localStorage.removeItem(GUEST_SLUGS_KEY);
    localStorage.removeItem(GUEST_ITEMS_KEY);
  } catch {
    // ignore storage errors
  }
}

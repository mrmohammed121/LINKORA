import type {
  AnalyticsResponse,
  HealthResponse,
  LinkItem,
  LinkStatus,
  OverviewAnalyticsResponse,
  User,
} from '../types';
import { getOrCreateGuestId } from './guestStorage';

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin)
).replace(/\/+$/, '');

export const PUBLIC_BASE_URL = (
  import.meta.env.VITE_PUBLIC_BASE_URL || API_BASE_URL
).replace(/\/+$/, '');

export const PUBLIC_BASE_HOST = PUBLIC_BASE_URL.replace(/^https?:\/\//, '');

export function getDisplayBaseHost(sampleShortUrl?: string): string {
  if (sampleShortUrl) {
    try {
      return new URL(sampleShortUrl).host;
    } catch {
      // fall through
    }
  }
  return PUBLIC_BASE_HOST;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem('linkora-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

async function fetchWithProxyFallback(
  path: string,
  init: RequestInit
): Promise<Response> {
  const normalizedPath = normalizePath(path);
  const primaryUrl = `${API_BASE_URL}${normalizedPath}`;

  try {
    return await fetch(primaryUrl, init);
  } catch (primaryErr) {
    // In local Vite dev, retry via same-origin /api proxy (-> http://127.0.0.1:4000)
    // to eliminate IPv6/IPv4 localhost resolution issues on Windows
    if (import.meta.env.DEV && normalizedPath.startsWith('/api')) {
      try {
        return await fetch(normalizedPath, init);
      } catch {
        // fall through to descriptive error
      }
    }

    const detail = primaryErr instanceof Error ? primaryErr.message : 'Network error';
    throw new ApiError(
      `Unable to reach the LINKORA backend at ${API_BASE_URL} (${detail}). Ensure both servers are running with "npm run dev".`,
      0,
      'NETWORK_ERROR'
    );
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const authToken = token === null ? null : (token ?? getStoredToken());
  const guestId = getOrCreateGuestId();

  const res = await fetchWithProxyFallback(path, {
    ...rest,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'X-Guest-Id': guestId,
      ...headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const errData = (await res.json()) as { message?: string; error?: string };
      if (errData.message) message = errData.message;
      if (errData.error) code = errData.error;
    } catch {
      // ignore non-JSON error body
    }
    throw new ApiError(message, res.status, code);
  }

  return (await res.json()) as T;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const str = sp.toString();
  return str ? `?${str}` : '';
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  auth: {
    register: (payload: { name: string; email: string; password: string }) =>
      request<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    login: (payload: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    me: () => request<{ user: User }>('/api/auth/me'),
    updateMe: (payload: { name?: string; currentPassword?: string; newPassword?: string }) =>
      request<{ user: User; token: string }>('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  links: {
    list: () => request<{ links: LinkItem[] }>('/api/links'),
    get: (id: string) => request<{ link: LinkItem }>(`/api/links/${id}`),
    create: (payload: { originalUrl: string; customSlug?: string; expiresAt?: string | null }) =>
      request<{ link: LinkItem }>('/api/links', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    createGuest: (payload: { originalUrl: string; customSlug?: string }) =>
      request<{ link: LinkItem }>('/api/links/guest', {
        method: 'POST',
        body: JSON.stringify(payload),
        token: null,
      }),
    claim: (slugs: string[], tokenOverride?: string) =>
      request<{ claimedCount: number; links: LinkItem[] }>('/api/links/claim', {
        method: 'POST',
        body: JSON.stringify({ slugs }),
        token: tokenOverride,
      }),
    update: (
      id: string,
      payload: { originalUrl?: string; status?: LinkStatus; expiresAt?: string | null }
    ) =>
      request<{ link: LinkItem }>(`/api/links/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ message: string; id: string }>(`/api/links/${id}`, {
        method: 'DELETE',
      }),
  },

  analytics: {
    overview: (params?: { granularity?: 'day' | 'hour'; from?: string; to?: string }) =>
      request<OverviewAnalyticsResponse>(
        `/api/analytics/overview${buildQuery({
          granularity: params?.granularity ?? 'day',
          from: params?.from,
          to: params?.to,
        })}`
      ),
    get: (id: string, params?: { granularity?: 'day' | 'hour'; from?: string; to?: string }) =>
      request<AnalyticsResponse>(
        `/api/analytics/${id}${buildQuery({
          granularity: params?.granularity ?? 'day',
          from: params?.from,
          to: params?.to,
        })}`
      ),
  },

  qr: {
    fetchSvgMarkup: async (id: string): Promise<string> => {
      const authToken = getStoredToken();
      const guestId = getOrCreateGuestId();
      const res = await fetchWithProxyFallback(`/api/qr/${id}?format=svg`, {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'X-Guest-Id': guestId,
        },
      });
      if (!res.ok) {
        throw new ApiError('Failed to generate QR preview', res.status);
      }
      return res.text();
    },

    fetchGuestSvgMarkup: async (slug: string): Promise<string> => {
      const res = await fetchWithProxyFallback(`/api/qr/guest/${encodeURIComponent(slug)}?format=svg`, {});
      if (!res.ok) {
        throw new ApiError('Failed to generate guest QR preview', res.status);
      }
      return res.text();
    },

    downloadFile: async (id: string, slug: string, format: 'png' | 'svg'): Promise<void> => {
      const authToken = getStoredToken();
      const guestId = getOrCreateGuestId();
      const res = await fetchWithProxyFallback(`/api/qr/${id}?format=${format}&download=1`, {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'X-Guest-Id': guestId,
        },
      });
      if (!res.ok) {
        throw new ApiError(`Failed to download ${format.toUpperCase()} QR code`, res.status);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `linkora-${slug}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },

    downloadGuestFile: async (slug: string, format: 'png' | 'svg'): Promise<void> => {
      const res = await fetchWithProxyFallback(
        `/api/qr/guest/${encodeURIComponent(slug)}?format=${format}&download=1`,
        {}
      );
      if (!res.ok) {
        throw new ApiError(`Failed to download ${format.toUpperCase()} QR code`, res.status);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `linkora-${slug}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  },
};

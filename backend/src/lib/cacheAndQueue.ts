import crypto from 'node:crypto';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';

export type LinkStatusValue = 'ACTIVE' | 'EXPIRED' | 'DISABLED';

export interface CachedLink {
  id: string;
  originalUrl: string;
  status: LinkStatusValue;
  expiresAt: string | null;
  /** ISO timestamp of the DB row this cache entry was read from; used to
   * avoid letting a stale write overwrite a newer entry (see `set`). */
  updatedAt: string;
}

export interface ClickEventPayload {
  linkId: string;
  referrer: string;
  userAgent: string;
  rawIp: string;
  region?: string;
  clickedAt: string;
}

interface MemoryCacheEntry {
  data: CachedLink;
  expiresAtMs: number;
}

const DEFAULT_TTL_SECONDS = 3600;
const memoryStore = new Map<string, MemoryCacheEntry>();

const INVALIDATE_CHANNEL = 'linkora:link:invalidate';

let optionalRedis: Redis | null = null;
if (env.REDIS_URL) {
  const isTls = env.REDIS_URL.startsWith('rediss://');
  optionalRedis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    connectTimeout: 4000,
  });
  optionalRedis.on('error', (err) => {
    console.warn('[Cache] Optional Redis error (using in-memory fallback):', err.message);
  });
  // Other instances share invalidation via this channel: without it each
  // instance's memory store keeps serving a stale link until its TTL ends.
  optionalRedis.on('message', (channel, message) => {
    if (channel === INVALIDATE_CHANNEL && message) {
      memoryStore.delete(message);
    }
  });
  void optionalRedis.subscribe(INVALIDATE_CHANNEL);
}

function cacheKey(slug: string): string {
  return `link:${slug}`;
}

export const linkCache = {
  mode: (optionalRedis ? 'redis+memory' : 'in-memory') as 'redis+memory' | 'in-memory',

  async get(slug: string): Promise<CachedLink | null> {
    const entry = memoryStore.get(slug);
    if (entry) {
      if (Date.now() <= entry.expiresAtMs) {
        return entry.data;
      }
      memoryStore.delete(slug);
    }

    if (optionalRedis) {
      try {
        const raw = await optionalRedis.get(cacheKey(slug));
        if (raw) {
          const parsed = JSON.parse(raw) as CachedLink;
          memoryStore.set(slug, {
            data: parsed,
            expiresAtMs: Date.now() + DEFAULT_TTL_SECONDS * 1000,
          });
          return parsed;
        }
      } catch {
        // Fallback silently to Prisma
      }
    }

    return null;
  },

  async set(slug: string, data: CachedLink, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    const existing = memoryStore.get(slug);
    // A newer write already landed (e.g. a QR Rescue update invalidated and
    // re-warmed the cache after this read); don't let the older read
    // overwrite it and serve stale destinations for up to the full TTL.
    if (
      existing &&
      data.updatedAt &&
      existing.data.updatedAt &&
      existing.data.updatedAt >= data.updatedAt
    ) {
      return;
    }

    memoryStore.set(slug, {
      data,
      expiresAtMs: Date.now() + ttlSeconds * 1000,
    });

    if (optionalRedis) {
      try {
        await optionalRedis.set(cacheKey(slug), JSON.stringify(data), 'EX', ttlSeconds);
      } catch {
        // Memory cache already populated
      }
    }
  },

  async invalidate(slug: string): Promise<void> {
    memoryStore.delete(slug);

    if (optionalRedis) {
      try {
        await optionalRedis.del(cacheKey(slug));
        // Broadcast so other instances drop their in-memory copies too
        // (their memory entries win over Redis until their TTL ends).
        await optionalRedis.publish(INVALIDATE_CHANNEL, slug);
      } catch {
        // Memory entry already invalidated
      }
    }
  },

  has(slug: string): boolean {
    const entry = memoryStore.get(slug);
    if (!entry) return false;
    if (Date.now() > entry.expiresAtMs) {
      memoryStore.delete(slug);
      return false;
    }
    return true;
  },

  size(): number {
    return memoryStore.size;
  },

  async close(): Promise<void> {
    if (optionalRedis) {
      await optionalRedis.quit();
      optionalRedis = null;
    }
  },
};

export function sanitizeReferrer(rawReferrer: string | undefined): string {
  if (!rawReferrer) return 'Direct';
  const trimmed = rawReferrer.trim();
  if (!trimmed) return 'Direct';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Direct';
    }
    return parsed.hostname.slice(0, 120) || 'Direct';
  } catch {
    return 'Direct';
  }
}

export function parseDeviceType(
  userAgent: string | undefined
): 'Mobile' | 'Desktop' | 'Tablet' | 'Bot' {
  if (!userAgent) return 'Desktop';
  const ua = userAgent.toLowerCase();

  if (
    /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|headless|curl|wget|python-requests|postman/i.test(
      ua
    )
  ) {
    return 'Bot';
  }

  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    return 'Tablet';
  }

  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'Mobile';
  }

  return 'Desktop';
}

export function anonymiseIp(rawIp: string, clickedAtIso: string): string {
  const dailyDate = clickedAtIso.slice(0, 10);
  const normalizedIp = rawIp.trim() || '127.0.0.1';
  return crypto
    .createHash('sha256')
    .update(`${normalizedIp}:${env.IP_HASH_SALT}:${dailyDate}`)
    .digest('hex');
}

function sanitizeRegion(rawRegion: string | undefined): string {
  if (!rawRegion) return 'Local/Unknown';
  const cleaned = rawRegion.replace(/[^a-zA-Z0-9/_-]/g, '').trim().slice(0, 32);
  return cleaned || 'Local/Unknown';
}

/**
 * Non-blocking async click analytics worker backed by setImmediate().
 * Ensures HTTP 302 redirects return in <5ms without waiting for SQLite writes.
 */
export function enqueueClickEvent(payload: ClickEventPayload): void {
  setImmediate(async () => {
    try {
      const cleanReferrer = sanitizeReferrer(payload.referrer);
      const deviceType = parseDeviceType(payload.userAgent);
      const region = sanitizeRegion(payload.region);
      const anonymisedIp = anonymiseIp(payload.rawIp, payload.clickedAt);

      await prisma.clickEvent.create({
        data: {
          linkId: payload.linkId,
          clickedAt: new Date(payload.clickedAt),
          referrer: cleanReferrer,
          deviceType,
          region,
          anonymisedIp,
        },
      });
    } catch (err) {
      console.error('[AsyncClickWorker] Failed to persist ClickEvent:', err);
    }
  });
}

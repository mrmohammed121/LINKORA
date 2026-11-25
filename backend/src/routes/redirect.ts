import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import {
  enqueueClickEvent,
  linkCache,
  type CachedLink,
  type LinkStatusValue,
} from '../lib/cacheAndQueue.js';
import { prisma } from '../lib/prisma.js';

function getClientIp(headers: Record<string, string | string[] | undefined>, fallbackIp: string): string {
  const forwardedFor = headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].split(',')[0].trim();
  }
  const realIp = headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp.trim();
  }
  return fallbackIp;
}

function getClientRegion(headers: Record<string, string | string[] | undefined>): string {
  const candidate =
    headers['cf-ipcountry'] ?? headers['x-vercel-ip-country'] ?? headers['x-country-code'];
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim().toUpperCase();
  }
  return 'Local/Unknown';
}

function rescueUrl(slug: string, reason: 'expired' | 'not_found'): string {
  return `${env.FRONTEND_URL}/rescue/${encodeURIComponent(slug)}?reason=${reason}`;
}

export async function redirectRoutes(app: FastifyInstance): Promise<void> {
  app.get('/favicon.ico', async (_request, reply) => reply.code(204).send());

  const handleRedirect = async (
    request: import('fastify').FastifyRequest<{ Params: { slug: string } }>,
    reply: import('fastify').FastifyReply
  ) => {
    const { slug } = request.params;

    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');

    // 1. Check linkCache first; on miss, query Prisma and populate cache
    let cached: CachedLink | null = await linkCache.get(slug);

    if (!cached) {
      const dbLink = await prisma.link.findUnique({
        where: { slug },
        select: {
          id: true,
          originalUrl: true,
          status: true,
          expiresAt: true,
          updatedAt: true,
        },
      });

      if (!dbLink) {
        return reply.code(302).redirect(rescueUrl(slug, 'not_found'));
      }

      cached = {
        id: dbLink.id,
        originalUrl: dbLink.originalUrl,
        status: dbLink.status as LinkStatusValue,
        expiresAt: dbLink.expiresAt ? dbLink.expiresAt.toISOString() : null,
        updatedAt: dbLink.updatedAt.toISOString(),
      };

      await linkCache.set(slug, cached);
    }

    // 2. If disabled or missing -> rescue fallback (not_found)
    if (cached.status === 'DISABLED') {
      return reply.code(302).redirect(rescueUrl(slug, 'not_found'));
    }

    // 3. If expired -> update status if needed, invalidate cache, redirect to rescue fallback (expired)
    if (cached.status === 'EXPIRED') {
      return reply.code(302).redirect(rescueUrl(slug, 'expired'));
    }

    if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
      void prisma.link
        .update({
          where: { id: cached.id },
          data: { status: 'EXPIRED' },
        })
        .catch((err) => {
          console.error('[Redirect] Failed to update expired link:', err);
        });
      await linkCache.invalidate(slug);

      return reply.code(302).redirect(rescueUrl(slug, 'expired'));
    }

    // 4. Enqueue async click analytics without blocking HTTP 302
    const referrerHeader = typeof request.headers.referer === 'string' ? request.headers.referer : '';
    const userAgentHeader =
      typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : '';

    enqueueClickEvent({
      linkId: cached.id,
      referrer: referrerHeader,
      userAgent: userAgentHeader,
      rawIp: getClientIp(request.headers, request.ip),
      region: getClientRegion(request.headers),
      clickedAt: new Date().toISOString(),
    });

    // 5. Return HTTP 302 Found immediately
    return reply.code(302).redirect(cached.originalUrl);
  };

  app.get<{ Params: { slug: string } }>('/:slug', handleRedirect);
  app.get<{ Params: { slug: string } }>('/r/:slug', handleRedirect);
}

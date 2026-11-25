import type { FastifyInstance } from 'fastify';
import type { Link } from '@prisma/client';
import { nanoid } from 'nanoid';
import { buildShortUrl } from '../config/env.js';
import { linkCache, type LinkStatusValue } from '../lib/cacheAndQueue.js';
import { prisma } from '../lib/prisma.js';
import { requireOwnerOrAdminOrGuest } from '../plugins/auth.js';
import {
  claimLinksSchema,
  createGuestLinkSchema,
  createLinkSchema,
  updateLinkSchema,
} from '../schemas/link.js';

const GUEST_EXPIRY_MS = 24 * 60 * 60 * 1000;

function formatLinkResponse(
  link: Link & {
    _count?: { clicks: number };
    owner?: { id: string; name: string; email: string } | null;
  }
) {
  const clickCount = link._count?.clicks ?? 0;
  return {
    id: link.id,
    ownerId: link.ownerId,
    originalUrl: link.originalUrl,
    slug: link.slug,
    shortUrl: buildShortUrl(link.slug),
    status: link.status as LinkStatusValue,
    isGuest: link.isGuest,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    _count: { clicks: clickCount },
    clickCount,
    isCached: linkCache.has(link.slug),
    ...(link.owner ? { owner: link.owner } : {}),
  };
}

async function warmLinkCache(link: Link): Promise<void> {
  await linkCache.set(link.slug, {
    id: link.id,
    originalUrl: link.originalUrl,
    status: link.status as LinkStatusValue,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    updatedAt: link.updatedAt.toISOString(),
  });
}

async function resolveUniqueSlug(customSlug?: string): Promise<
  | { ok: true; slug: string }
  | { ok: false; status: number; error: string; message: string }
> {
  if (customSlug) {
    const existing = await prisma.link.findUnique({
      where: { slug: customSlug },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false,
        status: 409,
        error: 'SLUG_TAKEN',
        message: `The slug "${customSlug}" is already in use. Please choose another.`,
      };
    }
    return { ok: true, slug: customSlug };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = nanoid(6);
    const existing = await prisma.link.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return { ok: true, slug: candidate };
    }
  }

  return {
    ok: false,
    status: 500,
    error: 'SLUG_GENERATION_FAILED',
    message: 'Could not generate a unique short slug. Please try again.',
  };
}

export async function linkRoutes(app: FastifyInstance): Promise<void> {
  // Public Guest "Try-It-Now" endpoint (24-hour temporary link + QR)
  app.post('/api/links/guest', { preHandler: [app.authenticateOptional] }, async (request, reply) => {
    const parsed = createGuestLinkSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid link payload',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { originalUrl, customSlug, expiresAt } = parsed.data;
    const slugResolution = await resolveUniqueSlug(customSlug);
    if (!slugResolution.ok) {
      return reply.code(slugResolution.status).send({
        error: slugResolution.error,
        message: slugResolution.message,
      });
    }

    const resolvedExpiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + GUEST_EXPIRY_MS);
    const link = await prisma.link.create({
      data: {
        ownerId: null,
        guestSessionId: request.guestSessionId ?? null,
        isGuest: true,
        originalUrl,
        slug: slugResolution.slug,
        expiresAt: resolvedExpiry,
      },
      include: {
        _count: { select: { clicks: true } },
      },
    });

    await warmLinkCache(link);

    return reply.code(201).send({
      link: formatLinkResponse(link),
    });
  });

  // Claim / Save guest links into an authenticated user's workspace
  app.post('/api/links/claim', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = claimLinksSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid claim payload',
      });
    }

    const uniqueSlugs = Array.from(new Set(parsed.data.slugs));
    const orConditions: Array<{ slug?: { in: string[] }; guestSessionId?: string }> = [];
    if (uniqueSlugs.length > 0) {
      orConditions.push({ slug: { in: uniqueSlugs } });
    }
    if (request.guestSessionId) {
      orConditions.push({ guestSessionId: request.guestSessionId });
    }

    if (orConditions.length === 0) {
      return reply.send({ claimedCount: 0, links: [] });
    }

    const guestLinks = await prisma.link.findMany({
      where: {
        isGuest: true,
        ownerId: null,
        OR: orConditions,
      },
    });

    if (guestLinks.length === 0) {
      return reply.send({ claimedCount: 0, links: [] });
    }

    const claimedIds = guestLinks.map((l) => l.id);
    await prisma.link.updateMany({
      where: { id: { in: claimedIds } },
      data: {
        ownerId: request.user.id,
        guestSessionId: null,
        isGuest: false,
        expiresAt: null,
        status: 'ACTIVE',
      },
    });

    const updatedLinks = await prisma.link.findMany({
      where: { id: { in: claimedIds } },
      include: {
        _count: { select: { clicks: true } },
      },
    });

    await Promise.all(
      updatedLinks.map(async (link) => {
        await linkCache.invalidate(link.slug);
        await warmLinkCache(link);
      })
    );

    return reply.send({
      claimedCount: updatedLinks.length,
      links: updatedLinks.map(formatLinkResponse),
    });
  });

  app.post('/api/links', { preHandler: [app.authenticateOptional] }, async (request, reply) => {
    if (!request.user?.id && !request.guestSessionId) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Provide authentication or a guest session ID to create links.',
      });
    }

    const parsed = createLinkSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid link payload',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { originalUrl, customSlug, expiresAt } = parsed.data;
    const slugResolution = await resolveUniqueSlug(customSlug);
    if (!slugResolution.ok) {
      return reply.code(slugResolution.status).send({
        error: slugResolution.error,
        message: slugResolution.message,
      });
    }

    const isAuthenticated = Boolean(request.user?.id);
    const resolvedExpiry = expiresAt
      ? new Date(expiresAt)
      : isAuthenticated
        ? null
        : new Date(Date.now() + GUEST_EXPIRY_MS);

    const link = await prisma.link.create({
      data: {
        ownerId: isAuthenticated ? request.user.id : null,
        guestSessionId: isAuthenticated ? null : (request.guestSessionId ?? null),
        isGuest: !isAuthenticated,
        originalUrl,
        slug: slugResolution.slug,
        expiresAt: resolvedExpiry,
      },
      include: {
        _count: { select: { clicks: true } },
      },
    });

    await warmLinkCache(link);

    return reply.code(201).send({
      link: formatLinkResponse(link),
    });
  });

  app.get('/api/links', { preHandler: [app.authenticateOptional] }, async (request, reply) => {
    if (!request.user?.id && !request.guestSessionId) {
      return reply.send({ links: [] });
    }

    const isAdmin = request.user?.role === 'ADMIN';
    const whereClause = request.user?.id
      ? isAdmin
        ? { ownerId: { not: null } }
        : { ownerId: request.user.id }
      : { isGuest: true, ownerId: null, guestSessionId: request.guestSessionId };

    const links = await prisma.link.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { clicks: true } },
        ...(isAdmin
          ? {
              owner: {
                select: { id: true, name: true, email: true },
              },
            }
          : {}),
      },
    });

    return reply.send({
      links: links.map(formatLinkResponse),
    });
  });

  app.get<{ Params: { id: string } }>(
    '/api/links/:id',
    { preHandler: [app.authenticateOptional, requireOwnerOrAdminOrGuest] },
    async (request, reply) => {
      const link = await prisma.link.findUnique({
        where: { id: request.params.id },
        include: {
          _count: { select: { clicks: true } },
        },
      });

      if (!link) {
        return reply.code(404).send({
          error: 'NOT_FOUND',
          message: 'Link not found',
        });
      }

      return reply.send({
        link: formatLinkResponse(link),
      });
    }
  );

  // QR Rescue Core Feature: Update destination, status, or expiry without changing slug
  app.put<{ Params: { id: string } }>(
    '/api/links/:id',
    { preHandler: [app.authenticateOptional, requireOwnerOrAdminOrGuest] },
    async (request, reply) => {
      const parsed = updateLinkSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid update payload',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { originalUrl, status, expiresAt } = parsed.data;

      const updated = await prisma.link.update({
        where: { id: request.params.id },
        data: {
          ...(originalUrl !== undefined ? { originalUrl } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(expiresAt !== undefined
            ? { expiresAt: expiresAt ? new Date(expiresAt) : null }
            : {}),
        },
        include: {
          _count: { select: { clicks: true } },
        },
      });

      await linkCache.invalidate(updated.slug);
      await warmLinkCache(updated);

      return reply.send({
        link: formatLinkResponse(updated),
      });
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/api/links/:id',
    { preHandler: [app.authenticateOptional, requireOwnerOrAdminOrGuest] },
    async (request, reply) => {
      const existing = request.targetLink!;

      await prisma.link.delete({
        where: { id: existing.id },
      });

      await linkCache.invalidate(existing.slug);

      return reply.send({
        message: 'Link deleted successfully',
        id: existing.id,
      });
    }
  );
}

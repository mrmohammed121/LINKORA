import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildShortUrl } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { requireOwnerOrAdminOrGuest } from '../plugins/auth.js';

const analyticsQuerySchema = z.object({
  granularity: z.enum(['day', 'hour']).default('day'),
  from: z.string().optional(),
  to: z.string().optional(),
});

function parseDateRange(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const parsedFrom = new Date(from);
    if (!Number.isNaN(parsedFrom.getTime())) {
      range.gte = parsedFrom;
    }
  }
  if (to) {
    const parsedTo = new Date(to);
    if (!Number.isNaN(parsedTo.getTime())) {
      // Include full end day if date-only string YYYY-MM-DD is passed
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        parsedTo.setUTCHours(23, 59, 59, 999);
      }
      range.lte = parsedTo;
    }
  }
  return range.gte || range.lte ? range : undefined;
}

function formatBucketKey(date: Date, granularity: 'day' | 'hour'): { key: string; label: string } {
  const iso = date.toISOString();
  if (granularity === 'hour') {
    const key = iso.slice(0, 13) + ':00:00Z';
    const label = `${iso.slice(5, 10)} ${iso.slice(11, 13)}:00`;
    return { key, label };
  }
  const key = iso.slice(0, 10);
  const label = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return { key, label };
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  // Workspace-wide Overview Analytics (must be registered before /:id)
  app.get('/api/analytics/overview', { preHandler: [app.authenticateOptional] }, async (request, reply) => {
    const parsed = analyticsQuerySchema.safeParse(request.query);
    const granularity = parsed.success ? parsed.data.granularity : 'day';
    const dateRange = parsed.success
      ? parseDateRange(parsed.data.from, parsed.data.to)
      : undefined;

    if (!request.user?.id && !request.guestSessionId) {
      return reply.send({
        granularity,
        summary: {
          totalLinks: 0,
          activeLinks: 0,
          expiredLinks: 0,
          disabledLinks: 0,
          totalClicks: 0,
          uniqueVisitors: 0,
        },
        insights: {
          topChannel: null,
          topLink: null,
          peakEngagement: null,
        },
        clicksOverTime: [],
        topLinks: [],
        referrers: [],
        devices: [],
        regions: [],
        recentActivity: [],
      });
    }

    const isAdmin = request.user?.role === 'ADMIN';
    const linkWhere = request.user?.id
      ? isAdmin
        ? {}
        : { ownerId: request.user.id }
      : { isGuest: true, ownerId: null, guestSessionId: request.guestSessionId };

    const links = await prisma.link.findMany({
      where: linkWhere,
      orderBy: { createdAt: 'desc' },
    });

    const linkIds = links.map((l) => l.id);
    const linkById = new Map(links.map((l) => [l.id, l]));

    const events =
      linkIds.length === 0
        ? []
        : await prisma.clickEvent.findMany({
            where: {
              linkId: { in: linkIds },
              ...(dateRange ? { clickedAt: dateRange } : {}),
            },
            orderBy: { clickedAt: 'asc' },
          });

    const seriesMap = new Map<string, { timestamp: string; label: string; clicks: number }>();
    const referrerCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    const regionCounts = new Map<string, number>();
    const linkClickCounts = new Map<string, number>();
    const uniqueIps = new Set<string>();

    for (const event of events) {
      const { key, label } = formatBucketKey(event.clickedAt, granularity);
      const bucket = seriesMap.get(key);
      if (bucket) {
        bucket.clicks += 1;
      } else {
        seriesMap.set(key, { timestamp: key, label, clicks: 1 });
      }

      referrerCounts.set(event.referrer, (referrerCounts.get(event.referrer) ?? 0) + 1);
      deviceCounts.set(event.deviceType, (deviceCounts.get(event.deviceType) ?? 0) + 1);
      regionCounts.set(event.region, (regionCounts.get(event.region) ?? 0) + 1);
      linkClickCounts.set(event.linkId, (linkClickCounts.get(event.linkId) ?? 0) + 1);
      uniqueIps.add(event.anonymisedIp);
    }

    const clicksOverTime = Array.from(seriesMap.values()).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );

    const referrers = Array.from(referrerCounts.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const devices = Array.from(deviceCounts.entries())
      .map(([deviceType, count]) => ({ deviceType, count }))
      .sort((a, b) => b.count - a.count);

    const regions = Array.from(regionCounts.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topLinks = links
      .map((l) => ({
        id: l.id,
        slug: l.slug,
        shortUrl: buildShortUrl(l.slug),
        originalUrl: l.originalUrl,
        status: l.status,
        clicks: linkClickCounts.get(l.id) ?? 0,
        createdAt: l.createdAt.toISOString(),
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    const recentActivity = events
      .slice(-25)
      .reverse()
      .map((e) => {
        const l = linkById.get(e.linkId);
        return {
          id: e.id,
          linkId: e.linkId,
          slug: l?.slug ?? 'unknown',
          shortUrl: l ? buildShortUrl(l.slug) : '',
          originalUrl: l?.originalUrl ?? '',
          clickedAt: e.clickedAt.toISOString(),
          referrer: e.referrer,
          deviceType: e.deviceType,
          region: e.region,
        };
      });

    const peakBucket = [...clicksOverTime].sort((a, b) => b.clicks - a.clicks)[0] ?? null;

    return reply.send({
      granularity,
      summary: {
        totalLinks: links.length,
        activeLinks: links.filter((l) => l.status === 'ACTIVE').length,
        expiredLinks: links.filter((l) => l.status === 'EXPIRED').length,
        disabledLinks: links.filter((l) => l.status === 'DISABLED').length,
        totalClicks: events.length,
        uniqueVisitors: uniqueIps.size,
      },
      insights: {
        topChannel: referrers[0] ?? null,
        topLink: topLinks[0] ?? null,
        peakEngagement: peakBucket,
      },
      clicksOverTime,
      topLinks,
      referrers,
      devices,
      regions,
      recentActivity,
    });
  });

  // Single-Link Analytics
  app.get<{ Params: { id: string } }>(
    '/api/analytics/:id',
    { preHandler: [app.authenticateOptional, requireOwnerOrAdminOrGuest] },
    async (request, reply) => {
      const parsed = analyticsQuerySchema.safeParse(request.query);
      const granularity = parsed.success ? parsed.data.granularity : 'day';
      const dateRange = parsed.success
        ? parseDateRange(parsed.data.from, parsed.data.to)
        : undefined;
      const link = request.targetLink!;

      const events = await prisma.clickEvent.findMany({
        where: {
          linkId: link.id,
          ...(dateRange ? { clickedAt: dateRange } : {}),
        },
        orderBy: { clickedAt: 'asc' },
      });

      const seriesMap = new Map<string, { timestamp: string; label: string; clicks: number }>();
      const referrerCounts = new Map<string, number>();
      const deviceCounts = new Map<string, number>();
      const regionCounts = new Map<string, number>();
      const uniqueIps = new Set<string>();

      for (const event of events) {
        const { key, label } = formatBucketKey(event.clickedAt, granularity);
        const existingBucket = seriesMap.get(key);
        if (existingBucket) {
          existingBucket.clicks += 1;
        } else {
          seriesMap.set(key, { timestamp: key, label, clicks: 1 });
        }

        referrerCounts.set(event.referrer, (referrerCounts.get(event.referrer) ?? 0) + 1);
        deviceCounts.set(event.deviceType, (deviceCounts.get(event.deviceType) ?? 0) + 1);
        regionCounts.set(event.region, (regionCounts.get(event.region) ?? 0) + 1);
        uniqueIps.add(event.anonymisedIp);
      }

      const clicksOverTime = Array.from(seriesMap.values()).sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp)
      );

      const referrers = Array.from(referrerCounts.entries())
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const devices = Array.from(deviceCounts.entries())
        .map(([deviceType, count]) => ({ deviceType, count }))
        .sort((a, b) => b.count - a.count);

      const regions = Array.from(regionCounts.entries())
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const recentClicks = events
        .slice(-25)
        .reverse()
        .map((e) => ({
          id: e.id,
          clickedAt: e.clickedAt.toISOString(),
          referrer: e.referrer,
          deviceType: e.deviceType,
          region: e.region,
        }));

      return reply.send({
        link: {
          id: link.id,
          slug: link.slug,
          shortUrl: buildShortUrl(link.slug),
          originalUrl: link.originalUrl,
          status: link.status,
          expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
          createdAt: link.createdAt.toISOString(),
        },
        granularity,
        totalClicks: events.length,
        uniqueVisitors: uniqueIps.size,
        clicksOverTime,
        referrers,
        devices,
        regions,
        recentClicks,
      });
    }
  );
}

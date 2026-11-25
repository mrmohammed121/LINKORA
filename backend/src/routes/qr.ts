import type { FastifyInstance, FastifyReply } from 'fastify';
import QRCode from 'qrcode';
import { z } from 'zod';
import { buildShortUrl } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { requireOwnerOrAdminOrGuest } from '../plugins/auth.js';

const qrQuerySchema = z.object({
  format: z.enum(['png', 'svg']).default('png'),
  download: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});

async function sendQrResponse(
  reply: FastifyReply,
  slug: string,
  format: 'png' | 'svg',
  download: boolean
) {
  const shortUrl = buildShortUrl(slug);
  const disposition = download ? 'attachment' : 'inline';

  if (format === 'svg') {
    const svg = await QRCode.toString(shortUrl, {
      type: 'svg',
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return reply
      .header('Content-Type', 'image/svg+xml; charset=utf-8')
      .header('Content-Disposition', `${disposition}; filename="linkora-${slug}.svg"`)
      .header('Cache-Control', 'no-store')
      .send(svg);
  }

  const pngBuffer = await QRCode.toBuffer(shortUrl, {
    type: 'png',
    margin: 2,
    width: 512,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return reply
    .header('Content-Type', 'image/png')
    .header('Content-Disposition', `${disposition}; filename="linkora-${slug}.png"`)
    .header('Cache-Control', 'no-store')
    .send(pngBuffer);
}

export async function qrRoutes(app: FastifyInstance): Promise<void> {
  // Public QR generation ONLY for unclaimed temporary guest links
  app.get<{ Params: { slug: string } }>('/api/qr/guest/:slug', async (request, reply) => {
    const parsed = qrQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'format must be either "png" or "svg"',
      });
    }

    const link = await prisma.link.findUnique({
      where: { slug: request.params.slug },
      select: { slug: true, isGuest: true, ownerId: true },
    });

    if (!link || !link.isGuest || link.ownerId !== null) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Guest QR code not found',
      });
    }

    return sendQrResponse(reply, link.slug, parsed.data.format, parsed.data.download);
  });

  // QR generation for owned or guest session links
  app.get<{ Params: { id: string } }>(
    '/api/qr/:id',
    { preHandler: [app.authenticateOptional, requireOwnerOrAdminOrGuest] },
    async (request, reply) => {
      const parsed = qrQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'format must be either "png" or "svg"',
        });
      }

      const link = request.targetLink!;
      return sendQrResponse(reply, link.slug, parsed.data.format, parsed.data.download);
    }
  );
}

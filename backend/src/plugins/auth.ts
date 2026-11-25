import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { Link } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUserPayload;
    user: AuthUserPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    targetLink?: Link;
    guestSessionId?: string;
  }
}

function extractGuestSessionId(request: FastifyRequest): string | undefined {
  const raw = request.headers['x-guest-id'];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(trimmed)) return undefined;
  return trimmed;
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: '7d',
    },
  });

  app.decorate('authenticate', async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    request.guestSessionId = extractGuestSessionId(request);
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in.',
      });
    }
  });

  app.decorate('authenticateOptional', async function authenticateOptional(request: FastifyRequest) {
    request.guestSessionId = extractGuestSessionId(request);
    const authHeader = request.headers.authorization;
    if (!authHeader) return;
    try {
      await request.jwtVerify();
    } catch {
      // Ignore invalid/expired token in optional auth and fall back to guest session
    }
  });
}

export async function requireOwnerOrAdmin(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;

  const link = await prisma.link.findUnique({
    where: { id },
  });

  if (!link) {
    return reply.code(404).send({
      error: 'NOT_FOUND',
      message: 'Link not found',
    });
  }

  if (link.ownerId !== request.user.id && request.user.role !== 'ADMIN') {
    return reply.code(403).send({
      error: 'FORBIDDEN',
      message: 'You do not have permission to access or modify this link',
    });
  }

  request.targetLink = link;
}

export async function requireOwnerOrAdminOrGuest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;

  const link = await prisma.link.findUnique({
    where: { id },
  });

  if (!link) {
    return reply.code(404).send({
      error: 'NOT_FOUND',
      message: 'Link not found',
    });
  }

  if (request.user?.id) {
    if (link.ownerId !== request.user.id && request.user.role !== 'ADMIN') {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not have permission to access or modify this link',
      });
    }
    request.targetLink = link;
    return;
  }

  if (request.guestSessionId && link.isGuest && link.ownerId === null && link.guestSessionId === request.guestSessionId) {
    request.targetLink = link;
    return;
  }

  return reply.code(401).send({
    error: 'UNAUTHORIZED',
    message: 'Sign in or use the browser session that created this link.',
  });
}

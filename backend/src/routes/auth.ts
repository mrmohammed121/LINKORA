import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { env } from '../config/env.js';
import { isPrismaError, prisma } from '../lib/prisma.js';
import { loginSchema, registerSchema } from '../schemas/auth.js';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
} as const;

const googleAuthSchema = z.object({
  credential: z.string().trim().min(1, 'Google credential token is required'),
});

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Display name must be at least 2 characters')
      .max(80, 'Display name must be at most 80 characters')
      .optional(),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password must be at most 128 characters')
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.newPassword !== undefined, {
    message: 'Provide a display name or new password to update',
  });

function signUserJwt(
  app: FastifyInstance,
  user: { id: string; email: string; name: string; role: string }
): string {
  return app.jwt.sign({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid registration payload',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return reply.code(409).send({
        error: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
        select: USER_PUBLIC_SELECT,
      });
    } catch (err) {
      // Concurrent registration with the same email passed the pre-check.
      if (isPrismaError(err, 'P2002')) {
        return reply.code(409).send({
          error: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        });
      }
      throw err;
    }

    const token = signUserJwt(app, user);

    return reply.code(201).send({
      token,
      user,
    });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid login payload',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.code(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (!user.passwordHash) {
      return reply.code(401).send({
        error: 'GOOGLE_ACCOUNT_ONLY',
        message: 'This account uses Google Sign-In. Click "Continue with Google" to sign in.',
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };

    const token = signUserJwt(app, profile);

    return reply.code(200).send({
      token,
      user: profile,
    });
  });

  app.post('/api/auth/google', async (request, reply) => {
    const parsed = googleAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Google credential token is required',
      });
    }

    const credential = parsed.data.credential;

    if (!env.GOOGLE_CLIENT_ID) {
      return reply.code(503).send({
        error: 'GOOGLE_AUTH_NOT_CONFIGURED',
        message:
          'Google OAuth is not configured on the server (set GOOGLE_CLIENT_ID in backend/.env).',
      });
    }

    let payload;
    try {
      const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return reply.code(401).send({
        error: 'INVALID_GOOGLE_TOKEN',
        message: 'Google sign-in token verification failed or expired. Please try again.',
      });
    }

    if (!payload?.sub || !payload.email) {
      return reply.code(401).send({
        error: 'INVALID_GOOGLE_TOKEN',
        message: 'Google account did not provide an email address.',
      });
    }

    if (payload.email_verified === false) {
      return reply.code(401).send({
        error: 'UNVERIFIED_GOOGLE_EMAIL',
        message: 'Please verify your Google email address before signing in.',
      });
    }

    const googleId = payload.sub;
    const email = payload.email.trim().toLowerCase();
    const displayName = (payload.name || email.split('@')[0] || 'LINKORA User').trim().slice(0, 80);
    const avatarUrl = payload.picture ?? null;

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
      select: USER_PUBLIC_SELECT,
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          ...(avatarUrl ? { avatarUrl } : {}),
        },
        select: USER_PUBLIC_SELECT,
      });
    } else {
      try {
        user = await prisma.user.create({
          data: {
            email,
            name: displayName,
            googleId,
            avatarUrl,
            passwordHash: null,
          },
          select: USER_PUBLIC_SELECT,
        });
      } catch (err) {
        if (isPrismaError(err, 'P2002')) {
          user = await prisma.user.findFirst({
            where: { OR: [{ googleId }, { email }] },
            select: USER_PUBLIC_SELECT,
          });
        } else {
          throw err;
        }
      }
    }

    if (!user) {
      return reply.code(500).send({
        error: 'AUTH_ERROR',
        message: 'Unable to complete Google sign-in.',
      });
    }

    const token = signUserJwt(app, user);

    return reply.code(200).send({
      token,
      user,
    });
  });

  app.get('/api/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'User account no longer exists',
      });
    }

    return reply.send({ user });
  });

  app.put('/api/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid profile update payload',
      });
    }

    const existing = await prisma.user.findUnique({
      where: { id: request.user.id },
    });

    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'User account no longer exists',
      });
    }

    let nextPasswordHash: string | undefined;
    if (parsed.data.newPassword) {
      if (existing.passwordHash) {
        if (!parsed.data.currentPassword) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            message: 'Current password is required to set a new password',
          });
        }
        const matches = await bcrypt.compare(parsed.data.currentPassword, existing.passwordHash);
        if (!matches) {
          return reply.code(401).send({
            error: 'INVALID_CREDENTIALS',
            message: 'Current password is incorrect',
          });
        }
      }
      nextPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
      },
      select: USER_PUBLIC_SELECT,
    });

    const token = signUserJwt(app, updated);

    return reply.send({ user: updated, token });
  });
}

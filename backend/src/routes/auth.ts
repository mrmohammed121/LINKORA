import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { isPrismaError, prisma } from '../lib/prisma.js';
import { loginSchema, registerSchema } from '../schemas/auth.js';

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
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
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

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

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
      role: user.role,
      createdAt: user.createdAt,
    };

    const token = app.jwt.sign({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    });

    return reply.code(200).send({
      token,
      user: profile,
    });
  });

  app.get('/api/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
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
      nextPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = app.jwt.sign({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    });

    return reply.send({ user: updated, token });
  });
}

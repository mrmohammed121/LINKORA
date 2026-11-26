import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Establishes and verifies the PostgreSQL connection on startup.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL connected successfully');
  } catch (err) {
    console.warn(
      '⚠️ Warning: PostgreSQL not reachable on startup (will retry on demand):',
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Gracefully closes the Prisma database connection pool.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * True when a Prisma operation failed with the given error code, e.g.
 * 'P2002' (unique constraint violation) or 'P2025' (record not found).
 */
export function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === code
  );
}

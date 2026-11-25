import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const rawNodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = rawNodeEnv === 'production';

// Support PUBLIC_BASE_URL (primary), with optional legacy BACKEND_PUBLIC_URL / Render fallback
const resolvedPublicBaseUrl =
  process.env.PUBLIC_BASE_URL?.trim() ||
  process.env.BACKEND_PUBLIC_URL?.trim() ||
  process.env.RENDER_EXTERNAL_URL?.trim() ||
  (isProd ? '' : 'http://localhost:4000');

const resolvedFrontendUrl =
  process.env.FRONTEND_URL?.trim() || (isProd ? resolvedPublicBaseUrl : 'http://localhost:5173');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PUBLIC_BASE_URL: z
    .string()
    .url('PUBLIC_BASE_URL must be a valid URL (set it in deployment environment variables)'),
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL must be a valid URL (set it in deployment environment variables)'),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  REDIS_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  JWT_SECRET: z.string().min(8).default('linkora-local-dev-jwt-secret-min-32-chars'),
  IP_HASH_SALT: z.string().min(4).default('linkora-daily-ip-hash-salt'),
});

const parsed = envSchema.safeParse({
  ...process.env,
  NODE_ENV: rawNodeEnv,
  PUBLIC_BASE_URL: resolvedPublicBaseUrl,
  FRONTEND_URL: resolvedFrontendUrl,
});

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const publicBaseUrl = parsed.data.PUBLIC_BASE_URL.replace(/\/+$/, '');
const frontendUrl = parsed.data.FRONTEND_URL.replace(/\/+$/, '');

const extraCorsOrigins = (parsed.data.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOrigins = Array.from(
  new Set([
    frontendUrl,
    ...extraCorsOrigins,
    ...(parsed.data.NODE_ENV !== 'production'
      ? ['http://localhost:5173', 'http://127.0.0.1:5173']
      : []),
  ])
);

export const env = {
  ...parsed.data,
  PUBLIC_BASE_URL: publicBaseUrl,
  FRONTEND_URL: frontendUrl,
  CORS_ORIGINS: corsOrigins,
};

/**
 * Builds the canonical public short URL for a slug from PUBLIC_BASE_URL.
 */
export function buildShortUrl(slug: string): string {
  return `${env.PUBLIC_BASE_URL}/${slug}`;
}

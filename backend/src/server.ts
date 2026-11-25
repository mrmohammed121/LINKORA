import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { linkCache } from './lib/cacheAndQueue.js';
import { connectDatabase, disconnectDatabase, prisma } from './lib/prisma.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { analyticsRoutes } from './routes/analytics.js';
import { authRoutes } from './routes/auth.js';
import { linkRoutes } from './routes/links.js';
import { qrRoutes } from './routes/qr.js';
import { redirectRoutes } from './routes/redirect.js';

export async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development' ? { level: 'info' } : { level: 'warn' },
    trustProxy: true,
  });

  // Accept an empty JSON body when a request carries the header but no
  // payload (e.g. DELETE /api/links/:id). Fastify's default JSON parser
  // rejects that with FST_ERR_CTP_EMPTY_JSON_BODY, which breaks bodyless
  // endpoints for clients that set Content-Type unconditionally.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const text = typeof body === 'string' ? body : body.toString('utf8');
    if (text === '') {
      return done(null, undefined);
    }
    try {
      done(null, JSON.parse(text));
    } catch (err) {
      done(err instanceof Error ? err : new Error('Invalid JSON body'));
    }
  });

  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Id'],
    credentials: true,
  });

  await registerAuthPlugin(app);

  app.get('/api/health', async (_request, reply) => {
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    return reply.code(dbOk ? 200 : 503).send({
      status: dbOk ? 'ok' : 'degraded',
      service: 'linkora-api',
      publicBaseUrl: env.PUBLIC_BASE_URL,
      database: dbOk ? 'postgresql:connected' : 'disconnected',
      cacheMode: linkCache.mode,
      cachedSlugs: linkCache.size(),
      timestamp: new Date().toISOString(),
    });
  });

  await app.register(authRoutes);
  await app.register(linkRoutes);
  await app.register(qrRoutes);
  await app.register(analyticsRoutes);
  await app.register(redirectRoutes);

  return app;
}

async function start() {
  const app = await buildServer();

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
      await app.close();
      await linkCache.close();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await connectDatabase();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 LINKORA API running on http://0.0.0.0:${env.PORT} (public: ${env.PUBLIC_BASE_URL}, cache: ${linkCache.mode})`);
  } catch (err) {
    app.log.error(err);
    await disconnectDatabase().catch(() => undefined);
    process.exit(1);
  }
}

void start();

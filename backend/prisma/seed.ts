import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hashDemoIp(seedIndex: number): string {
  return crypto
    .createHash('sha256')
    .update(`198.51.100.${(seedIndex % 250) + 1}:linkora-demo-salt`)
    .digest('hex');
}

async function main() {
  console.log('🌱 Seeding LINKORA SQLite database...');

  const passwordHash = await bcrypt.hash('Demo@1234', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@linkora.io' },
    update: {
      name: 'Demo Architect',
      passwordHash,
      role: 'USER',
    },
    create: {
      name: 'Demo Architect',
      email: 'demo@linkora.io',
      passwordHash,
      role: 'USER',
    },
  });

  // 1. Active link with 25 realistic historical ClickEvent entries
  const launchLink = await prisma.link.upsert({
    where: { slug: 'launch26' },
    update: {
      ownerId: demoUser.id,
      originalUrl: 'https://github.com/vercel/next.js',
      status: 'ACTIVE',
      expiresAt: null,
    },
    create: {
      ownerId: demoUser.id,
      originalUrl: 'https://github.com/vercel/next.js',
      slug: 'launch26',
      status: 'ACTIVE',
      expiresAt: null,
    },
  });

  const existingClicks = await prisma.clickEvent.count({
    where: { linkId: launchLink.id },
  });

  if (existingClicks === 0) {
    const referrers = ['Direct', 'github.com', 'x.com', 'linkedin.com', 'producthunt.com'];
    const devices = ['Mobile', 'Desktop', 'Mobile', 'Desktop', 'Tablet'] as const;
    const regions = ['US', 'IN', 'GB', 'DE', 'Local/Unknown'];
    const now = Date.now();

    const clickRows = Array.from({ length: 25 }, (_, i) => {
      const daysAgo = Math.floor((24 - i) / 4);
      const hoursOffset = (i * 3) % 24;
      const clickedAt = new Date(
        now - daysAgo * 24 * 60 * 60 * 1000 - hoursOffset * 60 * 60 * 1000
      );

      return {
        linkId: launchLink.id,
        clickedAt,
        referrer: referrers[i % referrers.length],
        deviceType: devices[i % devices.length],
        region: regions[i % regions.length],
        anonymisedIp: hashDemoIp(i),
      };
    });

    await prisma.clickEvent.createMany({ data: clickRows });
  }

  // 2. Expired link ready to be rescued
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.link.upsert({
    where: { slug: 'flyer-promo' },
    update: {
      ownerId: demoUser.id,
      originalUrl: 'https://example.com/expired-spring-menu',
      status: 'EXPIRED',
      expiresAt: yesterday,
    },
    create: {
      ownerId: demoUser.id,
      originalUrl: 'https://example.com/expired-spring-menu',
      slug: 'flyer-promo',
      status: 'EXPIRED',
      expiresAt: yesterday,
    },
  });

  // 3. Custom-slug active link
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.link.upsert({
    where: { slug: 'docs-hub' },
    update: {
      ownerId: demoUser.id,
      originalUrl: 'https://fastify.dev/docs/latest/',
      status: 'ACTIVE',
      expiresAt: nextMonth,
    },
    create: {
      ownerId: demoUser.id,
      originalUrl: 'https://fastify.dev/docs/latest/',
      slug: 'docs-hub',
      status: 'ACTIVE',
      expiresAt: nextMonth,
    },
  });

  console.log('✅ Seeded demo user (demo@linkora.io / Demo@1234) and 3 sample links.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

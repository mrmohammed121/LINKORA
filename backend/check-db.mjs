import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
try {
  const cols = await p.$queryRawUnsafe('PRAGMA table_info(Link)');
  console.log('COLUMNS', cols.map((c) => c.name).join(', '));
  const links = await p.link.findMany({ take: 1 });
  console.log('FIND_MANY_OK', links.length, links[0] ? Object.keys(links[0]).join(', ') : '');
} catch (e) {
  console.error('DB_ERROR', e.message);
} finally {
  await p.$disconnect();
}

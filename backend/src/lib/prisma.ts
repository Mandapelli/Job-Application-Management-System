import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env, isProd } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

// Split DATABASE_URL so credentials live only in .env.
const url = new URL(env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace('/', ''),
  connectionLimit: 10, // connection pool size
});

// One shared client per process (avoids exhausting connections on hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (!isProd) globalForPrisma.prisma = prisma;

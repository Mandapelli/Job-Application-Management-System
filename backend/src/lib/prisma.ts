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
  // MySQL 8 logs in with "caching_sha2_password". Whenever its password cache is empty (after MySQL restarts), a
  // login over a plain connection needs the server's RSA public key, and the driver refuses unless told it may ask
  // for it. Without this, every query fails with "pool failed to retrieve a connection". Fine on your own machine;
  // in production prefer an encrypted connection and leave this off (see DB_ALLOW_PUBLIC_KEY_RETRIEVAL in env.ts).
  allowPublicKeyRetrieval: env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL ?? !isProd,
});

// One shared client per process (avoids exhausting connections on hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (!isProd) globalForPrisma.prisma = prisma;

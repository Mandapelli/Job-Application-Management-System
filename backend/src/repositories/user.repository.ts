import { prisma } from '../lib/prisma.js';

// Never return passwordHash unless a caller explicitly needs it (login only).
const publicSelect = { id: true, name: true, email: true, createdAt: true } as const;

export const userRepository = {
  findByEmailWithPassword: (email: string) => prisma.user.findUnique({ where: { email } }),

  findPublicById: (id: string) =>
    prisma.user.findUnique({ where: { id }, select: publicSelect }),

  create: (data: { name: string; email: string; passwordHash: string }) =>
    prisma.user.create({ data, select: publicSelect }),
};

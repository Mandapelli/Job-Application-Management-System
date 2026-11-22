import { prisma } from '../lib/prisma.js';

// Never return passwordHash unless a caller explicitly needs it (login and change-password only).
const publicSelect = { id: true, name: true, email: true, createdAt: true } as const;

export const userRepository = {
  findByEmailWithPassword: (email: string) => prisma.user.findUnique({ where: { email } }),

  findByIdWithPassword: (id: string) => prisma.user.findUnique({ where: { id } }),

  findPublicByEmail: (email: string) => prisma.user.findUnique({ where: { email }, select: publicSelect }),

  findPublicById: (id: string) =>
    prisma.user.findUnique({ where: { id }, select: publicSelect }),

  /** What the login check needs on every request: does the user still exist, and when did the password last change? */
  findAuthState: (id: string) => prisma.user.findUnique({ where: { id }, select: { passwordChangedAt: true } }),

  create: (data: { name: string; email: string; passwordHash: string }) =>
    prisma.user.create({ data, select: publicSelect }),

  /** Saves a new password and cancels any outstanding "forgot password" links. Returns the change time. */
  setPassword: (userId: string, passwordHash: string) =>
    prisma.$transaction(async (tx) => {
      const changedAt = new Date();
      await tx.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: changedAt } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      return changedAt;
    }),
};

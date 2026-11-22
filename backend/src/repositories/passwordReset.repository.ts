import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

export const INVALID_LINK = 'This reset link is invalid or has expired';

export const passwordResetRepository = {
  /** When this user last asked for a reset link (used to stop rapid repeat requests). */
  async latestCreatedAt(userId: string) {
    const row = await prisma.passwordResetToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  },

  /** Stores a new link and cancels any older ones, so only the newest link ever works. */
  replaceFor: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
    }),

  /** The link, but only if it has not been used and has not expired. */
  findUsable: (tokenHash: string, now: Date) =>
    prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true },
    }),

  /**
   * Uses the link and sets the new password in ONE transaction. The link is claimed first with a conditional
   * update, so if two requests use the same link at the same moment, exactly one wins and the other is refused.
   */
  consumeAndSetPassword: (tokenId: string, userId: string, passwordHash: string, now: Date) =>
    prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: tokenId, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count === 0) throw AppError.badRequest(INVALID_LINK);

      await tx.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: now } });
      await tx.passwordResetToken.deleteMany({ where: { userId, id: { not: tokenId } } });
      return now;
    }),

  /** Housekeeping: removes links that expired before `cutoff`. */
  async purgeExpiredBefore(cutoff: Date) {
    const { count } = await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: cutoff } } });
    return count;
  },
};

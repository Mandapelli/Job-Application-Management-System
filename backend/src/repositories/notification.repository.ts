import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { ListNotificationsQuery } from '../validators/notification.validator.js';

const BATCH = 500;

/** Reads matching rows in batches of BATCH (by id), so a large number of candidates never loads at once. */
async function* inBatches<T extends { id: string }>(read: (cursor: { id: string } | undefined) => Promise<T[]>) {
  let cursor: { id: string } | undefined;
  for (;;) {
    const rows = await read(cursor);
    if (rows.length === 0) return;
    yield rows;
    if (rows.length < BATCH) return;
    cursor = { id: rows[rows.length - 1]!.id };
  }
}
const page = (cursor: { id: string } | undefined) => ({
  take: BATCH,
  orderBy: { id: 'asc' } as const,
  ...(cursor && { cursor, skip: 1 }),
});

export const notificationRepository = {
  // ---- what the user sees ----------------------------------------------------------------

  async list(userId: string, q: ListNotificationsQuery) {
    const where: Prisma.NotificationWhereInput = {
      userId, // every query is scoped to the owner
      ...(q.unread === true && { readAt: null }),
      ...(q.unread === false && { readAt: { not: null } }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        omit: { dedupeKey: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.notification.count({ where }),
    ]);
    return { items, total };
  },

  unreadCount: (userId: string) => prisma.notification.count({ where: { userId, readAt: null } }),

  /** Returns null if the notification doesn't exist or isn't owned by the user. */
  async setRead(userId: string, id: string, read: boolean) {
    const { count } = await prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: read ? new Date() : null },
    });
    if (count === 0) return null;
    return prisma.notification.findFirst({ where: { id, userId }, omit: { dedupeKey: true } });
  },

  async markAllRead(userId: string) {
    const { count } = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return count;
  },

  async delete(userId: string, id: string) {
    const { count } = await prisma.notification.deleteMany({ where: { id, userId } });
    return count > 0;
  },

  // ---- keeping reminders honest ------------------------------------------------------------

  /**
   * After an interview changes: unread reminders that no longer apply are removed. That means all of them if it is
   * no longer scheduled, or the ones made for an old date if it was rescheduled. Read ones are kept as history.
   */
  deleteStaleForInterview: (interview: { id: string; status: string; scheduledAt: Date }) =>
    prisma.notification.deleteMany({
      where: {
        interviewId: interview.id,
        readAt: null,
        ...(interview.status === 'SCHEDULED' && {
          NOT: { dedupeKey: { startsWith: `interview:${interview.id}:${interview.scheduledAt.getTime()}:` } },
        }),
      },
    }),

  /** Same idea for tasks: completed, or without a due date, or with a new due date. */
  deleteStaleForTask: (task: { id: string; status: string; dueAt: Date | null }) =>
    prisma.notification.deleteMany({
      where: {
        taskId: task.id,
        readAt: null,
        ...(task.status === 'PENDING' &&
          task.dueAt && { NOT: { dedupeKey: { startsWith: `task:${task.id}:${task.dueAt.getTime()}:` } } }),
      },
    }),

  /** Old, already-read notifications are cleaned up so the table doesn't grow forever. */
  async purgeReadBefore(cutoff: Date) {
    const { count } = await prisma.notification.deleteMany({
      where: { readAt: { not: null }, createdAt: { lt: cutoff } },
    });
    return count;
  },

  // ---- what the reminder job looks at (across all users) ----------------------------------------

  /** Inserts reminders, silently skipping any that already exist (same user + dedupeKey). */
  createMany: (data: Prisma.NotificationCreateManyInput[]) =>
    prisma.notification.createMany({ data, skipDuplicates: true }),

  upcomingInterviews: (from: Date, to: Date) =>
    inBatches((cursor) =>
      prisma.interview.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { gte: from, lte: to } },
        select: {
          id: true,
          userId: true,
          round: true,
          scheduledAt: true,
          application: { select: { jobTitle: true, companyName: true } },
        },
        ...page(cursor),
      }),
    ),

  /** Open tasks whose due date falls in [from, to]. */
  tasksDueBetween: (from: Date, to: Date) =>
    inBatches((cursor) =>
      prisma.task.findMany({
        where: { status: 'PENDING', dueAt: { gte: from, lte: to } },
        select: { id: true, userId: true, title: true, dueAt: true, application: { select: { companyName: true } } },
        ...page(cursor),
      }),
    ),
};

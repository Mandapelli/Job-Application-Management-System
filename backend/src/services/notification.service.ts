import type { Prisma } from '../generated/prisma/client.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { AppError } from '../utils/AppError.js';
import type { ListNotificationsQuery } from '../validators/notification.validator.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Overdue reminders are only created for tasks that became overdue recently, so a first run doesn't flood old ones. */
const OVERDUE_LOOKBACK = 7 * DAY;
const RETENTION = 90 * DAY;

const clip = (text: string) => (text.length > 480 ? `${text.slice(0, 477)}...` : text);

export const notificationService = {
  async list(userId: string, query: ListNotificationsQuery) {
    const { items, total } = await notificationRepository.list(userId, query);
    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  unreadCount: (userId: string) => notificationRepository.unreadCount(userId),

  async setRead(userId: string, id: string, read: boolean) {
    const notification = await notificationRepository.setRead(userId, id, read);
    if (!notification) throw AppError.notFound('Notification not found');
    return notification;
  },

  markAllRead: (userId: string) => notificationRepository.markAllRead(userId),

  async remove(userId: string, id: string) {
    if (!(await notificationRepository.delete(userId, id))) throw AppError.notFound('Notification not found');
  },

  /**
   * Creates the reminders that are due right now, for every user. Safe to run as often as you like, and from
   * several servers at once: a reminder that already exists is skipped (unique user + dedupeKey).
   *
   * Rules:
   *  - Interview in the next hour: "starting within the hour". In the next 24 hours: "in the next 24 hours".
   *    (An interview gets the second one first, then the first one later.)
   *  - Open task due within 24 hours: "due soon".
   *  - Open task that became overdue in the last 7 days: "overdue".
   * Returns how many new notifications were created.
   */
  async generateDue(now = new Date()): Promise<number> {
    let created = 0;
    const save = async (rows: Prisma.NotificationCreateManyInput[]) => {
      if (rows.length > 0) created += (await notificationRepository.createMany(rows)).count;
    };

    for await (const interviews of notificationRepository.upcomingInterviews(now, new Date(now.getTime() + DAY))) {
      await save(
        interviews.map((i) => {
          const withinHour = i.scheduledAt.getTime() - now.getTime() <= HOUR;
          return {
            userId: i.userId,
            type: 'INTERVIEW_REMINDER',
            title: withinHour ? 'Interview starting within the hour' : 'Interview in the next 24 hours',
            message: clip(`${i.application.jobTitle} at ${i.application.companyName} (round ${i.round})`),
            link: `/interviews/${i.id}`,
            eventAt: i.scheduledAt,
            interviewId: i.id,
            // The date is part of the key, so rescheduling an interview creates a fresh reminder.
            dedupeKey: `interview:${i.id}:${i.scheduledAt.getTime()}:${withinHour ? '1h' : '24h'}`,
          };
        }),
      );
    }

    for await (const tasks of notificationRepository.tasksDueBetween(now, new Date(now.getTime() + DAY))) {
      await save(
        tasks.map((t) => ({
          userId: t.userId,
          type: 'TASK_DUE' as const,
          title: 'Task due soon',
          message: clip(t.application ? `${t.title} (${t.application.companyName})` : t.title),
          link: `/tasks/${t.id}/edit`,
          eventAt: t.dueAt,
          taskId: t.id,
          dedupeKey: `task:${t.id}:${t.dueAt!.getTime()}:due`,
        })),
      );
    }

    for await (const tasks of notificationRepository.tasksDueBetween(
      new Date(now.getTime() - OVERDUE_LOOKBACK),
      new Date(now.getTime() - 1),
    )) {
      await save(
        tasks.map((t) => ({
          userId: t.userId,
          type: 'TASK_OVERDUE' as const,
          title: 'Task overdue',
          message: clip(t.application ? `${t.title} (${t.application.companyName})` : t.title),
          link: `/tasks/${t.id}/edit`,
          eventAt: t.dueAt,
          taskId: t.id,
          dedupeKey: `task:${t.id}:${t.dueAt!.getTime()}:overdue`,
        })),
      );
    }

    return created;
  },

  /** Deletes read notifications older than 90 days. Returns how many were removed. */
  purgeOld: (now = new Date()) => notificationRepository.purgeReadBefore(new Date(now.getTime() - RETENTION)),
};

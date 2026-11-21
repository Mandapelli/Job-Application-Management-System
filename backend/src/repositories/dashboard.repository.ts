import { prisma } from '../lib/prisma.js';

export const dashboardRepository = {
  /** Number of applications in each status. */
  statusCounts: (userId: string) =>
    prisma.jobApplication.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),

  /** How many interviews, in total and by outcome. */
  interviewCounts: async (userId: string) => {
    const [total, completed, passed, upcoming] = await Promise.all([
      prisma.interview.count({ where: { userId } }),
      prisma.interview.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.interview.count({ where: { userId, result: 'PASSED' } }),
      prisma.interview.count({ where: { userId, status: 'SCHEDULED', scheduledAt: { gte: new Date() } } }),
    ]);
    return { total, completed, passed, upcoming };
  },

  /** Applications that have at least one interview that was not cancelled. */
  async applicationsWithInterview(userId: string) {
    const rows = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT applicationId) AS c
      FROM interviews
      WHERE userId = ${userId} AND status <> 'CANCELLED'`;
    return Number(rows[0]?.c ?? 0);
  },

  /** Applications per week (Monday start) since `since`, using the applied date, or the created date if none. */
  async weeklyCounts(userId: string, since: Date) {
    const rows = await prisma.$queryRaw<{ weekStart: Date; count: bigint }[]>`
      SELECT DATE_SUB(DATE(COALESCE(appliedDate, createdAt)), INTERVAL WEEKDAY(COALESCE(appliedDate, createdAt)) DAY) AS weekStart,
             COUNT(*) AS count
      FROM job_applications
      WHERE userId = ${userId} AND COALESCE(appliedDate, createdAt) >= ${since}
      GROUP BY weekStart
      ORDER BY weekStart`;
    return rows.map((r) => ({ weekStart: new Date(r.weekStart), count: Number(r.count) }));
  },

  /** Open tasks, most urgent first: overdue ones come first, then by due date, undated ones last. */
  openTasks: (userId: string, take: number) =>
    prisma.task.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }],
      take,
      omit: { description: true },
      include: { application: { select: { id: true, jobTitle: true, companyName: true } } },
    }),

  recentApplications: (userId: string, take: number) =>
    prisma.jobApplication.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        status: true,
        location: true,
        appliedDate: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        createdAt: true,
      },
    }),

  upcomingInterviews: (userId: string, take: number) =>
    prisma.interview.findMany({
      where: { userId, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
      take,
      omit: { feedback: true, notes: true },
      include: { application: { select: { id: true, jobTitle: true, companyName: true } } },
    }),
};

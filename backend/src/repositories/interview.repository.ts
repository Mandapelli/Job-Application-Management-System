import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { ListInterviewsQuery } from '../validators/interview.validator.js';

const application = { select: { id: true, jobTitle: true, companyName: true, status: true } } as const;

export const interviewRepository = {
  /** True only if the application exists and belongs to this user. */
  applicationOwned: async (userId: string, applicationId: string) =>
    !!(await prisma.jobApplication.findFirst({ where: { id: applicationId, userId }, select: { id: true } })),

  async list(userId: string, q: ListInterviewsQuery) {
    const now = new Date();
    const where: Prisma.InterviewWhereInput = {
      userId, // every query is scoped to the owner
      ...(q.status && { status: q.status }),
      ...(q.result && { result: q.result }),
      ...(q.applicationId && { applicationId: q.applicationId }),
      // "upcoming" = still on the calendar: scheduled and not in the past.
      ...(q.when === 'upcoming' && { scheduledAt: { gte: now }, status: 'SCHEDULED' }),
      ...(q.when === 'past' && { scheduledAt: { lt: now } }),
      ...(q.search && {
        OR: [
          { interviewerName: { contains: q.search } },
          { application: { jobTitle: { contains: q.search } } },
          { application: { companyName: { contains: q.search } } },
        ],
      }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.interview.findMany({
        where,
        omit: { feedback: true, notes: true },
        include: { application },
        orderBy: [{ [q.sortBy]: q.sortOrder }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.interview.count({ where }),
    ]);
    return { items, total };
  },

  findOwnedDetail: (userId: string, id: string) =>
    prisma.interview.findFirst({ where: { id, userId }, include: { application } }),

  create: (userId: string, data: Omit<Prisma.InterviewUncheckedCreateInput, 'userId'>) =>
    prisma.interview.create({ data: { ...data, userId }, include: { application } }),

  /** Returns null when the interview doesn't exist or isn't owned by the user. */
  async update(userId: string, id: string, data: Prisma.InterviewUncheckedUpdateManyInput) {
    const { count } = await prisma.interview.updateMany({ where: { id, userId }, data });
    if (count === 0) return null;
    return prisma.interview.findFirst({ where: { id, userId }, include: { application } });
  },

  async delete(userId: string, id: string) {
    const { count } = await prisma.interview.deleteMany({ where: { id, userId } });
    return count > 0;
  },
};

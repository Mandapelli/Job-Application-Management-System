import { prisma } from '../lib/prisma.js';
import type { ApplicationStatus, Prisma } from '../generated/prisma/client.js';
import type { ListApplicationsQuery } from '../validators/application.validator.js';

// Lists skip the large text columns; details include them plus status history.
const listOmit = { jobDescription: true, notes: true } as const;
const detailInclude = { statusHistory: { orderBy: { changedAt: 'desc' } } } as const;

function buildWhere(userId: string, q: ListApplicationsQuery): Prisma.JobApplicationWhereInput {
  return {
    userId, // every query is scoped to the owner
    ...(q.status && { status: q.status }),
    ...(q.workMode && { workMode: q.workMode }),
    ...(q.employmentType && { employmentType: q.employmentType }),
    ...(q.location && { location: { contains: q.location } }),
    ...(q.search && {
      OR: [{ companyName: { contains: q.search } }, { jobTitle: { contains: q.search } }],
    }),
  };
}

export const applicationRepository = {
  async list(userId: string, q: ListApplicationsQuery) {
    const where = buildWhere(userId, q);
    const [items, total] = await prisma.$transaction([
      prisma.jobApplication.findMany({
        where,
        omit: listOmit,
        // Secondary sort keys keep pagination stable when the main key ties (or is NULL).
        orderBy: [{ [q.sortBy]: q.sortOrder }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.jobApplication.count({ where }),
    ]);
    return { items, total };
  },

  findOwnedDetail: (userId: string, id: string) =>
    prisma.jobApplication.findFirst({ where: { id, userId }, include: detailInclude }),

  /** Creates the application and its first history row atomically. */
  create: (userId: string, data: Omit<Prisma.JobApplicationUncheckedCreateInput, 'userId'>) =>
    prisma.$transaction(async (tx) => {
      const app = await tx.jobApplication.create({ data: { ...data, userId } });
      await tx.applicationStatusHistory.create({
        data: { applicationId: app.id, userId, fromStatus: null, toStatus: app.status },
      });
      return tx.jobApplication.findUniqueOrThrow({ where: { id: app.id }, include: detailInclude });
    }),

  /** Returns null when the application doesn't exist or isn't owned by the user. */
  async update(userId: string, id: string, data: Prisma.JobApplicationUncheckedUpdateManyInput) {
    const { count } = await prisma.jobApplication.updateMany({ where: { id, userId }, data });
    if (count === 0) return null;
    return prisma.jobApplication.findFirst({ where: { id, userId }, include: detailInclude });
  },

  async delete(userId: string, id: string) {
    const { count } = await prisma.jobApplication.deleteMany({ where: { id, userId } });
    return count > 0;
  },

  /**
   * Changes status and writes the history row in one transaction.
   * The status in the WHERE clause guards against two requests racing each other.
   */
  changeStatus: (userId: string, id: string, to: ApplicationStatus) =>
    prisma.$transaction(async (tx) => {
      const current = await tx.jobApplication.findFirst({
        where: { id, userId },
        select: { status: true },
      });
      if (!current) return { kind: 'not_found' as const };
      if (current.status === to) return { kind: 'unchanged' as const, id };

      const { count } = await tx.jobApplication.updateMany({
        where: { id, userId, status: current.status },
        data: { status: to },
      });
      if (count === 0) return { kind: 'conflict' as const };

      await tx.applicationStatusHistory.create({
        data: { applicationId: id, userId, fromStatus: current.status, toStatus: to },
      });
      return { kind: 'changed' as const, id };
    }),
};

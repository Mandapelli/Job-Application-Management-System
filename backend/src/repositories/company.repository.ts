import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { ListCompaniesQuery } from '../validators/company.validator.js';

const counts = { _count: { select: { applications: true, recruiters: true } } } as const;

const detailInclude = {
  ...counts,
  recruiters: {
    select: { id: true, name: true, title: true, email: true, phone: true },
    orderBy: { name: 'asc' },
    take: 50,
  },
  applications: {
    select: { id: true, jobTitle: true, status: true, appliedDate: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  },
} as const;

export const companyRepository = {
  /** Returns the company only if it belongs to this user (used by the applications module). */
  findOwned: (userId: string, id: string) =>
    prisma.company.findFirst({ where: { id, userId }, select: { id: true, name: true } }),

  /** Is this name already used by one of the user's companies? (excludeId lets a company keep its own name) */
  nameTaken: async (userId: string, name: string, excludeId?: string) =>
    !!(await prisma.company.findFirst({
      where: { userId, name, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    })),

  async list(userId: string, q: ListCompaniesQuery) {
    const where: Prisma.CompanyWhereInput = {
      userId,
      ...(q.search && {
        OR: [
          { name: { contains: q.search } },
          { industry: { contains: q.search } },
          { location: { contains: q.search } },
        ],
      }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.company.findMany({
        where,
        omit: { notes: true },
        include: counts,
        orderBy: [{ [q.sortBy]: q.sortOrder }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.company.count({ where }),
    ]);
    return { items, total };
  },

  findOwnedDetail: (userId: string, id: string) =>
    prisma.company.findFirst({ where: { id, userId }, include: detailInclude }),

  create: (userId: string, data: Omit<Prisma.CompanyUncheckedCreateInput, 'userId'>) =>
    prisma.company.create({ data: { ...data, userId }, include: counts }),

  /**
   * Updates the company. If it was renamed, the name copied onto its applications is updated too,
   * in the same transaction, so the two never disagree.
   */
  update: (userId: string, id: string, data: Prisma.CompanyUncheckedUpdateManyInput) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.company.updateMany({ where: { id, userId }, data });
      if (count === 0) return null;
      if (typeof data.name === 'string') {
        await tx.jobApplication.updateMany({
          where: { companyId: id, userId },
          data: { companyName: data.name },
        });
      }
      return tx.company.findFirst({ where: { id, userId }, include: detailInclude });
    }),

  /** Applications are kept: their companyId becomes NULL and their copied companyName stays. */
  async delete(userId: string, id: string) {
    const { count } = await prisma.company.deleteMany({ where: { id, userId } });
    return count > 0;
  },
};

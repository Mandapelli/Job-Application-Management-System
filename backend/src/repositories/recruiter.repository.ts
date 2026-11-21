import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { ListRecruitersQuery } from '../validators/recruiter.validator.js';

const relations = {
  company: { select: { id: true, name: true } },
  _count: { select: { applications: true } },
} as const;

const detailInclude = {
  ...relations,
  applications: {
    select: { id: true, jobTitle: true, companyName: true, status: true, appliedDate: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  },
} as const;

export const recruiterRepository = {
  /** Returns the recruiter's contact details only if it belongs to this user. */
  findOwned: (userId: string, id: string) =>
    prisma.recruiter.findFirst({
      where: { id, userId },
      select: { id: true, name: true, email: true, phone: true },
    }),

  async list(userId: string, q: ListRecruitersQuery) {
    const where: Prisma.RecruiterWhereInput = {
      userId,
      ...(q.companyId && { companyId: q.companyId }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search } },
          { email: { contains: q.search } },
          { title: { contains: q.search } },
          { company: { name: { contains: q.search } } },
        ],
      }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.recruiter.findMany({
        where,
        omit: { notes: true },
        include: relations,
        orderBy: [{ [q.sortBy]: q.sortOrder }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.recruiter.count({ where }),
    ]);
    return { items, total };
  },

  findOwnedDetail: (userId: string, id: string) =>
    prisma.recruiter.findFirst({ where: { id, userId }, include: detailInclude }),

  create: (userId: string, data: Omit<Prisma.RecruiterUncheckedCreateInput, 'userId'>) =>
    prisma.recruiter.create({ data: { ...data, userId }, include: relations }),

  /**
   * Updates the recruiter. Changed name/email/phone are copied onto the applications linked to this
   * recruiter in the same transaction, so an application never shows stale contact details.
   */
  update: (userId: string, id: string, data: Prisma.RecruiterUncheckedUpdateManyInput) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.recruiter.updateMany({ where: { id, userId }, data });
      if (count === 0) return null;

      const copy: Prisma.JobApplicationUncheckedUpdateManyInput = {};
      if ('name' in data) copy.recruiterName = data.name as string;
      if ('email' in data) copy.recruiterEmail = data.email as string | null;
      if ('phone' in data) copy.recruiterPhone = data.phone as string | null;
      if (Object.keys(copy).length > 0) {
        await tx.jobApplication.updateMany({ where: { recruiterId: id, userId }, data: copy });
      }
      return tx.recruiter.findFirst({ where: { id, userId }, include: detailInclude });
    }),

  /** Applications are kept: recruiterId becomes NULL and their copied contact details stay. */
  async delete(userId: string, id: string) {
    const { count } = await prisma.recruiter.deleteMany({ where: { id, userId } });
    return count > 0;
  },
};

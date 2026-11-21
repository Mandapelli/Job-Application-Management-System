import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { ListTasksQuery } from '../validators/task.validator.js';

const application = { select: { id: true, jobTitle: true, companyName: true } } as const;

/** The three states a task can be in, as database conditions. "Overdue" is worked out from dueAt at query time. */
export function viewCondition(view: 'pending' | 'overdue' | 'completed', now = new Date()): Prisma.TaskWhereInput {
  switch (view) {
    case 'completed':
      return { status: 'COMPLETED' };
    case 'overdue':
      return { status: 'PENDING', dueAt: { lt: now } };
    case 'pending':
      return { status: 'PENDING', OR: [{ dueAt: null }, { dueAt: { gte: now } }] };
  }
}

export const taskRepository = {
  applicationOwned: async (userId: string, applicationId: string) =>
    !!(await prisma.jobApplication.findFirst({ where: { id: applicationId, userId }, select: { id: true } })),

  async list(userId: string, q: ListTasksQuery) {
    const and: Prisma.TaskWhereInput[] = [];
    if (q.view) and.push(viewCondition(q.view));
    if (q.search) {
      and.push({
        OR: [
          { title: { contains: q.search } },
          { description: { contains: q.search } },
          { application: { jobTitle: { contains: q.search } } },
          { application: { companyName: { contains: q.search } } },
        ],
      });
    }
    const where: Prisma.TaskWhereInput = {
      userId, // every query is scoped to the owner
      ...(q.priority && { priority: q.priority }),
      ...(q.applicationId && { applicationId: q.applicationId }),
      ...(and.length > 0 && { AND: and }),
    };
    // Tasks without a due date always sort after tasks that have one.
    const primary: Prisma.TaskOrderByWithRelationInput =
      q.sortBy === 'dueAt' ? { dueAt: { sort: q.sortOrder, nulls: 'last' } } : { [q.sortBy]: q.sortOrder };

    const [items, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        include: { application },
        orderBy: [primary, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.task.count({ where }),
    ]);
    return { items, total };
  },

  /** How many tasks are pending, overdue and completed (for the tab badges). */
  async counts(userId: string) {
    const count = (view: 'pending' | 'overdue' | 'completed') =>
      prisma.task.count({ where: { userId, ...viewCondition(view) } });
    const [pending, overdue, completed] = await Promise.all([count('pending'), count('overdue'), count('completed')]);
    return { pending, overdue, completed, total: pending + overdue + completed };
  },

  findOwned: (userId: string, id: string) =>
    prisma.task.findFirst({ where: { id, userId }, include: { application } }),

  create: (userId: string, data: Omit<Prisma.TaskUncheckedCreateInput, 'userId'>) =>
    prisma.task.create({ data: { ...data, userId }, include: { application } }),

  /** Returns null when the task doesn't exist or isn't owned by the user. */
  async update(userId: string, id: string, data: Prisma.TaskUncheckedUpdateManyInput) {
    const { count } = await prisma.task.updateMany({ where: { id, userId }, data });
    if (count === 0) return null;
    return prisma.task.findFirst({ where: { id, userId }, include: { application } });
  },

  async delete(userId: string, id: string) {
    const { count } = await prisma.task.deleteMany({ where: { id, userId } });
    return count > 0;
  },
};

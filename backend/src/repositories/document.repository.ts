import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { ListDocumentsQuery } from '../validators/document.validator.js';

// storageKey is internal: it is never returned to the client.
const listSelect = {
  id: true,
  name: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  type: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { applications: true } },
} as const;

const detailSelect = {
  ...listSelect,
  applications: {
    select: { application: { select: { id: true, jobTitle: true, companyName: true } } },
    orderBy: { createdAt: 'desc' },
  },
} as const;

export const documentRepository = {
  count: (userId: string) => prisma.document.count({ where: { userId } }),

  applicationOwned: async (userId: string, applicationId: string) =>
    !!(await prisma.jobApplication.findFirst({ where: { id: applicationId, userId }, select: { id: true } })),

  async list(userId: string, q: ListDocumentsQuery) {
    const where: Prisma.DocumentWhereInput = {
      userId, // every query is scoped to the owner
      ...(q.type && { type: q.type }),
      ...(q.applicationId && { applications: { some: { applicationId: q.applicationId } } }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search } },
          { fileName: { contains: q.search } },
          { description: { contains: q.search } },
        ],
      }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.document.findMany({
        where,
        select: listSelect,
        orderBy: [{ [q.sortBy]: q.sortOrder }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.document.count({ where }),
    ]);
    return { items, total };
  },

  findOwnedDetail: (userId: string, id: string) =>
    prisma.document.findFirst({ where: { id, userId }, select: detailSelect }),

  /** Includes storageKey: only for streaming the file back to its owner. */
  findOwnedForDownload: (userId: string, id: string) =>
    prisma.document.findFirst({
      where: { id, userId },
      select: { id: true, fileName: true, mimeType: true, sizeBytes: true, storageKey: true },
    }),

  create: (userId: string, data: Omit<Prisma.DocumentUncheckedCreateInput, 'userId'>) =>
    prisma.document.create({ data: { ...data, userId }, select: listSelect }),

  async update(userId: string, id: string, data: Prisma.DocumentUncheckedUpdateManyInput) {
    const { count } = await prisma.document.updateMany({ where: { id, userId }, data });
    if (count === 0) return null;
    return prisma.document.findFirst({ where: { id, userId }, select: detailSelect });
  },

  /** Deletes the row and returns its storage key (so the caller can delete the file), or null if not found. */
  async delete(userId: string, id: string) {
    const doc = await prisma.document.findFirst({ where: { id, userId }, select: { storageKey: true } });
    if (!doc) return null;
    const { count } = await prisma.document.deleteMany({ where: { id, userId } });
    return count > 0 ? doc.storageKey : null;
  },

  attach: (documentId: string, applicationId: string) =>
    prisma.applicationDocument.upsert({
      where: { applicationId_documentId: { applicationId, documentId } },
      create: { applicationId, documentId },
      update: {}, // already attached: nothing to do
    }),

  async detach(documentId: string, applicationId: string) {
    const { count } = await prisma.applicationDocument.deleteMany({ where: { applicationId, documentId } });
    return count > 0;
  },
};

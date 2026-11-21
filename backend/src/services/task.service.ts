import { notificationRepository } from '../repositories/notification.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { AppError } from '../utils/AppError.js';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '../validators/task.validator.js';

async function assertOwnedApplication(userId: string, applicationId: string | null | undefined) {
  if (applicationId && !(await taskRepository.applicationOwned(userId, applicationId))) {
    throw AppError.badRequest('Application not found');
  }
}

/** completedAt always matches the status: set when a task is completed, cleared when it is reopened. */
const completion = (status: 'PENDING' | 'COMPLETED' | undefined) =>
  status === undefined ? {} : { completedAt: status === 'COMPLETED' ? new Date() : null };

export const taskService = {
  async list(userId: string, query: ListTasksQuery) {
    const { items, total } = await taskRepository.list(userId, query);
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

  summary: (userId: string) => taskRepository.counts(userId),

  async getById(userId: string, id: string) {
    const task = await taskRepository.findOwned(userId, id);
    if (!task) throw AppError.notFound('Task not found');
    return task;
  },

  async create(userId: string, input: CreateTaskInput) {
    await assertOwnedApplication(userId, input.applicationId);
    return taskRepository.create(userId, { ...input, ...completion(input.status) });
  },

  async update(userId: string, id: string, input: UpdateTaskInput) {
    await assertOwnedApplication(userId, input.applicationId);
    const task = await taskRepository.update(userId, id, { ...input, ...completion(input.status) });
    if (!task) throw AppError.notFound('Task not found');
    // Completed, or the due date changed: drop the unread reminders that no longer apply.
    await notificationRepository.deleteStaleForTask(task);
    return task;
  },

  async remove(userId: string, id: string) {
    if (!(await taskRepository.delete(userId, id))) throw AppError.notFound('Task not found');
  },
};

import { z } from 'zod';
import { TaskPriority, TaskStatus } from '../generated/prisma/client.js';
import { optText, paginationQuery } from './common.js';

// ISO timestamp with timezone, e.g. "2026-12-12T09:00:00.000Z" (the browser converts local time to this).
const dueAt = z.iso
  .datetime({ offset: true, error: 'Use an ISO date-time, e.g. 2026-12-12T09:00:00Z' })
  .transform((s) => new Date(s))
  .nullable()
  .optional();

const fields = {
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: optText(20_000),
  dueAt,
  priority: z.enum(TaskPriority),
  status: z.enum(TaskStatus),
  applicationId: z.uuid().nullable().optional(),
};

export const createTaskSchema = z.object({
  ...fields,
  priority: fields.priority.default('MEDIUM'),
  status: fields.status.default('PENDING'),
});

export const updateTaskSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listTasksQuerySchema = z.object({
  ...paginationQuery,
  search: z.string().trim().max(100).optional(),
  // pending = open and not late; overdue = open and past its due date; completed = done
  view: z.enum(['pending', 'overdue', 'completed']).optional(),
  priority: z.enum(TaskPriority).optional(),
  applicationId: z.uuid().optional(),
  sortBy: z.enum(['dueAt', 'createdAt', 'priority']).default('dueAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateTaskInput = z.output<typeof createTaskSchema>;
export type UpdateTaskInput = z.output<typeof updateTaskSchema>;
export type ListTasksQuery = z.output<typeof listTasksQuerySchema>;

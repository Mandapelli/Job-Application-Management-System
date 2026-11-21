import { z } from 'zod';
import { toLocalInputValue } from '@/features/interviews/schemas';
import { PRIORITIES, TASK_STATUSES, type Task, type TaskPayload } from './types';

export const NO_APPLICATION = 'NONE'; // Radix Select cannot use '' as a value

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(20_000),
  // <input type="datetime-local"> gives "2026-12-12T09:00" in the user's own timezone, or '' for no due date.
  dueAt: z.string().refine((v) => v === '' || !Number.isNaN(new Date(v).getTime()), 'Invalid date and time'),
  priority: z.enum(PRIORITIES),
  status: z.enum(TASK_STATUSES),
  applicationId: z.string(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const emptyTaskValues: TaskFormValues = {
  title: '',
  description: '',
  dueAt: '',
  priority: 'MEDIUM',
  status: 'PENDING',
  applicationId: NO_APPLICATION,
};

export const toTaskFormValues = (t: Task): TaskFormValues => ({
  title: t.title,
  description: t.description ?? '',
  dueAt: t.dueAt ? toLocalInputValue(t.dueAt) : '',
  priority: t.priority,
  status: t.status,
  applicationId: t.applicationId ?? NO_APPLICATION,
});

export const toTaskPayload = (v: TaskFormValues): TaskPayload => ({
  title: v.title.trim(),
  description: v.description.trim() === '' ? null : v.description.trim(),
  dueAt: v.dueAt === '' ? null : new Date(v.dueAt).toISOString(),
  priority: v.priority,
  status: v.status,
  applicationId: v.applicationId === NO_APPLICATION ? null : v.applicationId,
});

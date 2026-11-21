export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const TASK_STATUSES = ['PENDING', 'COMPLETED'] as const;

export type TaskPriority = (typeof PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITY_LABELS: Record<TaskPriority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

export interface Task {
  id: string;
  applicationId: string | null;
  title: string;
  description?: string | null;
  dueAt: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  application: { id: string; jobTitle: string; companyName: string } | null;
}

export interface TaskPayload {
  title: string;
  description: string | null;
  dueAt: string | null; // ISO timestamp with timezone
  priority: TaskPriority;
  status: TaskStatus;
  applicationId: string | null;
}

export type TaskView = 'pending' | 'overdue' | 'completed';

export interface TaskListParams {
  page: number;
  limit: number;
  search?: string;
  view?: TaskView;
  priority?: TaskPriority;
  applicationId?: string;
  sortBy: 'dueAt' | 'createdAt' | 'priority';
  sortOrder: 'asc' | 'desc';
}

export interface TaskSummary {
  pending: number;
  overdue: number;
  completed: number;
  total: number;
}

/** Overdue = still open and past its due date (the server uses the same rule). */
export const isOverdue = (t: Pick<Task, 'status' | 'dueAt'>, now = Date.now()) =>
  t.status === 'PENDING' && t.dueAt !== null && new Date(t.dueAt).getTime() < now;

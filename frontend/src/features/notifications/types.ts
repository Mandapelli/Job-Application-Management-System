export type NotificationType = 'INTERVIEW_REMINDER' | 'TASK_DUE' | 'TASK_OVERDUE';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** In-app path to open, e.g. /interviews/<id>. */
  link: string | null;
  /** When the interview happens / the task is due. */
  eventAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListParams {
  page: number;
  limit: number;
  unread?: boolean;
}

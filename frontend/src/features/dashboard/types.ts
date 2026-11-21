import type { ApplicationStatus } from '@/features/applications/types';
import type { InterviewType } from '@/features/interviews/types';
import type { TaskPriority, TaskStatus } from '@/features/tasks/types';

export interface DashboardSummary {
  totals: { applications: number; submitted: number; offers: number };
  byStatus: Record<ApplicationStatus, number>;
  interviews: { total: number; completed: number; passed: number; upcoming: number };
  /** Shares of submitted applications, 0..1, or null when there are none yet. */
  rates: { response: number | null; interview: number | null; offer: number | null };
  weekly: { weekStart: string; count: number }[];
  thisWeek: number;
  lastWeek: number;
  recentApplications: {
    id: string;
    jobTitle: string;
    companyName: string;
    status: ApplicationStatus;
    location: string | null;
    appliedDate: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    createdAt: string;
  }[];
  tasks: { pending: number; overdue: number; completed: number };
  openTasks: {
    id: string;
    title: string;
    dueAt: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    application: { id: string; jobTitle: string; companyName: string } | null;
  }[];
  upcomingInterviews: {
    id: string;
    round: number;
    type: InterviewType;
    scheduledAt: string;
    meetingUrl: string | null;
    application: { id: string; jobTitle: string; companyName: string };
  }[];
}

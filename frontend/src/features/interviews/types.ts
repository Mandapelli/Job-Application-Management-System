export const INTERVIEW_TYPES = ['PHONE', 'VIDEO', 'ONSITE', 'TECHNICAL', 'BEHAVIORAL', 'HR', 'OTHER'] as const;
export const INTERVIEW_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;
export const INTERVIEW_RESULTS = ['PENDING', 'PASSED', 'FAILED'] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number];

export const TYPE_LABELS: Record<InterviewType, string> = {
  PHONE: 'Phone screen',
  VIDEO: 'Video call',
  ONSITE: 'On-site',
  TECHNICAL: 'Technical',
  BEHAVIORAL: 'Behavioral',
  HR: 'HR',
  OTHER: 'Other',
};
export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
export const RESULT_LABELS: Record<InterviewResult, string> = {
  PENDING: 'Pending',
  PASSED: 'Passed',
  FAILED: 'Failed',
};

export interface Interview {
  id: string;
  applicationId: string;
  round: number;
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  interviewerName: string | null;
  status: InterviewStatus;
  result: InterviewResult;
  feedback?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  application: { id: string; jobTitle: string; companyName: string; status?: string };
}

/** Body for POST /interviews (applicationId is only sent on create). */
export interface InterviewPayload {
  applicationId?: string;
  round: number;
  type: InterviewType;
  scheduledAt: string; // ISO timestamp with timezone
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  interviewerName: string | null;
  status: InterviewStatus;
  result: InterviewResult;
  feedback: string | null;
  notes: string | null;
}

export interface InterviewListParams {
  page: number;
  limit: number;
  search?: string;
  status?: InterviewStatus;
  result?: InterviewResult;
  applicationId?: string;
  when?: 'upcoming' | 'past';
  sortBy: 'scheduledAt' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

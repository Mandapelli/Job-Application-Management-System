export const STATUSES = [
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] as const;
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] as const;
export const WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;

export type ApplicationStatus = (typeof STATUSES)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type WorkMode = (typeof WORK_MODES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};
export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
};
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'Onsite',
};

export interface StatusHistoryEntry {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
}

export interface Application {
  id: string;
  companyId: string | null;
  companyName: string;
  jobTitle: string;
  jobDescription?: string | null;
  jobUrl: string | null;
  location: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  appliedDate: string | null;
  status: ApplicationStatus;
  recruiterId: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterPhone: string | null;
  resumeId: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory?: StatusHistoryEntry[];
}

/** Body accepted by POST /applications and PATCH /applications/:id. */
export interface ApplicationPayload {
  companyId: string | null;
  recruiterId: string | null;
  companyName: string;
  jobTitle: string;
  jobDescription: string | null;
  jobUrl: string | null;
  location: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  appliedDate: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterPhone: string | null;
  notes: string | null;
  status?: ApplicationStatus;
}

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  status?: ApplicationStatus;
  location?: string;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  sortBy: 'appliedDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

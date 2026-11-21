import type { ApplicationStatus } from '@/features/applications/types';

export interface Recruiter {
  id: string;
  companyId: string | null;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string } | null;
  _count?: { applications: number };
  applications?: {
    id: string;
    jobTitle: string;
    companyName: string;
    status: ApplicationStatus;
    appliedDate: string | null;
    createdAt: string;
  }[];
}

export interface RecruiterPayload {
  name: string;
  companyId: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  notes: string | null;
}

export interface RecruiterListParams {
  page: number;
  limit: number;
  search?: string;
  companyId?: string;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

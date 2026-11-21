import type { ApplicationStatus } from '@/features/applications/types';

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { applications: number; recruiters: number };
  recruiters?: {
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
  }[];
  applications?: {
    id: string;
    jobTitle: string;
    status: ApplicationStatus;
    appliedDate: string | null;
    createdAt: string;
  }[];
}

export interface CompanyPayload {
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  notes: string | null;
}

export interface CompanyListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

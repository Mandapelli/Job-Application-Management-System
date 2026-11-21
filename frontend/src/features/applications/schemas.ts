import { z } from 'zod';
import {
  EMPLOYMENT_TYPES,
  STATUSES,
  WORK_MODES,
  type Application,
  type ApplicationPayload,
  type EmploymentType,
  type WorkMode,
} from './types';

// All form values are strings (that is what inputs give us); toPayload() converts them for the API.
const digits = z.string().trim().regex(/^\d*$/, 'Digits only').max(9, 'Too large');

/** Value of the company/recruiter pickers when nothing is linked (Radix Select cannot use ''). */
export const NO_LINK = 'NONE';

export const applicationFormSchema = z
  .object({
    companyId: z.string(),
    recruiterId: z.string(),
    companyName: z.string().trim().min(1, 'Company name is required').max(150),
    jobTitle: z.string().trim().min(1, 'Job title is required').max(150),
    location: z.string().trim().max(150),
    employmentType: z.enum([...EMPLOYMENT_TYPES, 'NONE']),
    workMode: z.enum([...WORK_MODES, 'NONE']),
    salaryMin: digits,
    salaryMax: digits,
    salaryCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter code, e.g. USD'),
    appliedDate: z.string().refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Invalid date'),
    status: z.enum(STATUSES),
    jobUrl: z
      .string()
      .trim()
      .max(2048)
      .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Must start with http:// or https://'),
    recruiterName: z.string().trim().max(100),
    recruiterEmail: z
      .string()
      .trim()
      .max(255)
      .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email'),
    recruiterPhone: z.string().trim().max(30),
    jobDescription: z.string().max(20_000),
    notes: z.string().max(20_000),
  })
  .refine((v) => v.salaryMin === '' || v.salaryMax === '' || Number(v.salaryMin) <= Number(v.salaryMax), {
    message: 'Minimum salary cannot exceed maximum',
    path: ['salaryMin'],
  });

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export const emptyFormValues: ApplicationFormValues = {
  companyId: NO_LINK,
  recruiterId: NO_LINK,
  companyName: '',
  jobTitle: '',
  location: '',
  employmentType: 'NONE',
  workMode: 'NONE',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  appliedDate: '',
  status: 'WISHLIST',
  jobUrl: '',
  recruiterName: '',
  recruiterEmail: '',
  recruiterPhone: '',
  jobDescription: '',
  notes: '',
};

/** Converts a loaded application into form values (nulls become empty strings / "NONE"). */
export function toFormValues(app: Application): ApplicationFormValues {
  return {
    companyId: app.companyId ?? NO_LINK,
    recruiterId: app.recruiterId ?? NO_LINK,
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    location: app.location ?? '',
    employmentType: app.employmentType ?? 'NONE',
    workMode: app.workMode ?? 'NONE',
    salaryMin: app.salaryMin?.toString() ?? '',
    salaryMax: app.salaryMax?.toString() ?? '',
    salaryCurrency: app.salaryCurrency,
    appliedDate: app.appliedDate ? app.appliedDate.slice(0, 10) : '',
    status: app.status,
    jobUrl: app.jobUrl ?? '',
    recruiterName: app.recruiterName ?? '',
    recruiterEmail: app.recruiterEmail ?? '',
    recruiterPhone: app.recruiterPhone ?? '',
    jobDescription: app.jobDescription ?? '',
    notes: app.notes ?? '',
  };
}

const text = (v: string) => (v.trim() === '' ? null : v.trim());

export function toPayload(v: ApplicationFormValues, includeStatus: boolean): ApplicationPayload {
  return {
    companyId: v.companyId === NO_LINK ? null : v.companyId,
    recruiterId: v.recruiterId === NO_LINK ? null : v.recruiterId,
    companyName: v.companyName.trim(),
    jobTitle: v.jobTitle.trim(),
    jobDescription: text(v.jobDescription),
    jobUrl: text(v.jobUrl),
    location: text(v.location),
    employmentType: v.employmentType === 'NONE' ? null : (v.employmentType as EmploymentType),
    workMode: v.workMode === 'NONE' ? null : (v.workMode as WorkMode),
    salaryMin: v.salaryMin === '' ? null : Number(v.salaryMin),
    salaryMax: v.salaryMax === '' ? null : Number(v.salaryMax),
    salaryCurrency: v.salaryCurrency.trim().toUpperCase(),
    appliedDate: text(v.appliedDate),
    recruiterName: text(v.recruiterName),
    recruiterEmail: text(v.recruiterEmail),
    recruiterPhone: text(v.recruiterPhone),
    notes: text(v.notes),
    ...(includeStatus && { status: v.status }),
  };
}

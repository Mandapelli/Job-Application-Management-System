import { z } from 'zod';
import { ApplicationStatus, EmploymentType, WorkMode } from '../generated/prisma/client.js';

// Optional text field: trimmed, length-limited, null clears it, '' becomes null.
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

const optUrl = z
  .union([z.literal(''), z.url({ protocol: /^https?$/, error: 'Must be a valid http(s) URL' })])
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .pipe(z.string().max(2048).nullable().optional());

const optEmail = z
  .union([z.literal(''), z.email('Invalid email address')])
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

// "YYYY-MM-DD" -> Date at UTC midnight (stored in a DATE column).
const optDate = z.iso
  .date('Use format YYYY-MM-DD')
  .transform((s) => new Date(`${s}T00:00:00.000Z`))
  .nullable()
  .optional();

const salary = z.number().int().min(0).max(100_000_000).nullable().optional();

const fields = {
  companyId: z.uuid().nullable().optional(),
  companyName: z.string().trim().min(1, 'Company name is required').max(150).optional(),
  jobTitle: z.string().trim().min(1, 'Job title is required').max(150),
  jobDescription: optText(20_000),
  jobUrl: optUrl,
  location: optText(150),
  employmentType: z.enum(EmploymentType).nullable().optional(),
  workMode: z.enum(WorkMode).nullable().optional(),
  salaryMin: salary,
  salaryMax: salary,
  salaryCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code')
    .optional(),
  appliedDate: optDate,
  recruiterId: z.uuid().nullable().optional(),
  recruiterName: optText(100),
  recruiterEmail: optEmail,
  recruiterPhone: optText(30),
  resumeId: z.uuid().nullable().optional(),
  notes: optText(20_000),
};

const salaryRange = (v: { salaryMin?: number | null; salaryMax?: number | null }) =>
  v.salaryMin == null || v.salaryMax == null || v.salaryMin <= v.salaryMax;
const salaryIssue = { message: 'Minimum salary cannot exceed maximum', path: ['salaryMin'] };

export const createApplicationSchema = z
  .object({ ...fields, status: z.enum(ApplicationStatus).default('WISHLIST') })
  .refine((v) => v.companyName || v.companyId, {
    message: 'Provide a company name or choose a company',
    path: ['companyName'],
  })
  .refine(salaryRange, salaryIssue);

// Status is NOT editable here; use PATCH /:id/status so history is always recorded.
export const updateApplicationSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' })
  .refine(salaryRange, salaryIssue);

export const updateStatusSchema = z.object({ status: z.enum(ApplicationStatus) });

export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.enum(ApplicationStatus).optional(),
  location: z.string().trim().max(150).optional(),
  workMode: z.enum(WorkMode).optional(),
  employmentType: z.enum(EmploymentType).optional(),
  sortBy: z.enum(['appliedDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateApplicationInput = z.output<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.output<typeof updateApplicationSchema>;
export type ListApplicationsQuery = z.output<typeof listApplicationsQuerySchema>;

import { z } from 'zod';
import { optEmail, optText, optUrl, paginationQuery } from './common.js';

const fields = {
  name: z.string().trim().min(1, 'Recruiter name is required').max(100),
  companyId: z.uuid().nullable().optional(),
  title: optText(100),
  email: optEmail,
  phone: optText(30),
  linkedinUrl: optUrl,
  notes: optText(20_000),
};

export const createRecruiterSchema = z.object(fields);

export const updateRecruiterSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listRecruitersQuerySchema = z.object({
  ...paginationQuery,
  search: z.string().trim().max(100).optional(),
  companyId: z.uuid().optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateRecruiterInput = z.output<typeof createRecruiterSchema>;
export type UpdateRecruiterInput = z.output<typeof updateRecruiterSchema>;
export type ListRecruitersQuery = z.output<typeof listRecruitersQuerySchema>;

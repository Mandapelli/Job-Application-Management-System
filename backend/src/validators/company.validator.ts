import { z } from 'zod';
import { optText, optUrl, paginationQuery } from './common.js';

const fields = {
  name: z.string().trim().min(1, 'Company name is required').max(150),
  website: optUrl,
  industry: optText(100),
  location: optText(150),
  notes: optText(20_000),
};

export const createCompanySchema = z.object(fields);

export const updateCompanySchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listCompaniesQuerySchema = z.object({
  ...paginationQuery,
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateCompanyInput = z.output<typeof createCompanySchema>;
export type UpdateCompanyInput = z.output<typeof updateCompanySchema>;
export type ListCompaniesQuery = z.output<typeof listCompaniesQuerySchema>;

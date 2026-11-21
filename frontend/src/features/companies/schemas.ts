import { z } from 'zod';
import type { Company, CompanyPayload } from './types';

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(150),
  website: z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Must start with http:// or https://'),
  industry: z.string().trim().max(100),
  location: z.string().trim().max(150),
  notes: z.string().max(20_000),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export const emptyCompanyValues: CompanyFormValues = {
  name: '',
  website: '',
  industry: '',
  location: '',
  notes: '',
};

export const toCompanyFormValues = (c: Company): CompanyFormValues => ({
  name: c.name,
  website: c.website ?? '',
  industry: c.industry ?? '',
  location: c.location ?? '',
  notes: c.notes ?? '',
});

const text = (v: string) => (v.trim() === '' ? null : v.trim());

export const toCompanyPayload = (v: CompanyFormValues): CompanyPayload => ({
  name: v.name.trim(),
  website: text(v.website),
  industry: text(v.industry),
  location: text(v.location),
  notes: text(v.notes),
});

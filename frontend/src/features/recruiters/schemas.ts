import { z } from 'zod';
import type { Recruiter, RecruiterPayload } from './types';

export const NO_COMPANY = 'NONE'; // Radix Select cannot use '' as a value

export const recruiterFormSchema = z.object({
  name: z.string().trim().min(1, 'Recruiter name is required').max(100),
  companyId: z.string(),
  title: z.string().trim().max(100),
  email: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email'),
  phone: z.string().trim().max(30),
  linkedinUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Must start with http:// or https://'),
  notes: z.string().max(20_000),
});

export type RecruiterFormValues = z.infer<typeof recruiterFormSchema>;

export const emptyRecruiterValues: RecruiterFormValues = {
  name: '',
  companyId: NO_COMPANY,
  title: '',
  email: '',
  phone: '',
  linkedinUrl: '',
  notes: '',
};

export const toRecruiterFormValues = (r: Recruiter): RecruiterFormValues => ({
  name: r.name,
  companyId: r.companyId ?? NO_COMPANY,
  title: r.title ?? '',
  email: r.email ?? '',
  phone: r.phone ?? '',
  linkedinUrl: r.linkedinUrl ?? '',
  notes: r.notes ?? '',
});

const text = (v: string) => (v.trim() === '' ? null : v.trim());

export const toRecruiterPayload = (v: RecruiterFormValues): RecruiterPayload => ({
  name: v.name.trim(),
  companyId: v.companyId === NO_COMPANY ? null : v.companyId,
  title: text(v.title),
  email: text(v.email),
  phone: text(v.phone),
  linkedinUrl: text(v.linkedinUrl),
  notes: text(v.notes),
});

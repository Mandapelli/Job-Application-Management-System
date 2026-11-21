import { z } from 'zod';
import { DocumentType } from '../generated/prisma/client.js';
import { optText, paginationQuery } from './common.js';

// Multipart form fields arrive as strings; an empty box means "not provided".
const optName = z
  .string()
  .trim()
  .max(255)
  .transform((v) => v || undefined)
  .optional();

export const uploadDocumentSchema = z.object({
  name: optName,
  type: z.enum(DocumentType).default('RESUME'),
  description: optText(1000),
});

export const updateDocumentSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(255),
    type: z.enum(DocumentType),
    description: optText(1000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const attachDocumentSchema = z.object({ applicationId: z.uuid() });

export const listDocumentsQuerySchema = z.object({
  ...paginationQuery,
  search: z.string().trim().max(100).optional(),
  type: z.enum(DocumentType).optional(),
  applicationId: z.uuid().optional(),
  sortBy: z.enum(['createdAt', 'name', 'sizeBytes']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UploadDocumentInput = z.output<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.output<typeof updateDocumentSchema>;
export type ListDocumentsQuery = z.output<typeof listDocumentsQuerySchema>;

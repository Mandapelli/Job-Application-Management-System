import { z } from 'zod';
import { ALLOWED_EXTENSIONS, DOCUMENT_TYPES, MAX_UPLOAD_MB, type DocumentItem } from './types';

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

/** Checks a chosen file before uploading. Returns an error message, or null if it looks fine. */
export function checkFile(file: File | undefined): string | null {
  if (!file) return 'Choose a file to upload';
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
    return 'Only PDF, DOC and DOCX files are allowed';
  }
  if (file.size === 0) return 'The file is empty';
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `The file is larger than ${MAX_UPLOAD_MB} MB`;
  return null;
}

export const uploadFormSchema = z.object({
  file: z.custom<FileList>().superRefine((files, ctx) => {
    const message = checkFile(files?.[0]);
    if (message) ctx.addIssue({ code: 'custom', message });
  }),
  name: z.string().trim().max(255),
  type: z.enum(DOCUMENT_TYPES),
  description: z.string().trim().max(1000),
});
export type UploadFormValues = z.infer<typeof uploadFormSchema>;

export const editFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  type: z.enum(DOCUMENT_TYPES),
  description: z.string().trim().max(1000),
});
export type EditFormValues = z.infer<typeof editFormSchema>;

export const toEditFormValues = (d: DocumentItem): EditFormValues => ({
  name: d.name,
  type: d.type,
  description: d.description ?? '',
});

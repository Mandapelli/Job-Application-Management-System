import { z } from 'zod';

/** Optional text: trimmed, length-limited; '' becomes null; null clears the field. */
export const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

/** Optional http(s) URL ('' becomes null). Rejects javascript:, data: and similar schemes. */
export const optUrl = z
  .union([z.literal(''), z.url({ protocol: /^https?$/, error: 'Must be a valid http(s) URL' })])
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .pipe(z.string().max(2048).nullable().optional());

export const optEmail = z
  .union([z.literal(''), z.email('Invalid email address')])
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

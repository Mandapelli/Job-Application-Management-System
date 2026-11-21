import { z } from 'zod';
import { paginationQuery } from './common.js';

export const listNotificationsQuerySchema = z.object({
  ...paginationQuery,
  // ?unread=true -> only unread; ?unread=false -> only read; omitted -> all
  unread: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const markReadSchema = z.object({ read: z.boolean() });

export type ListNotificationsQuery = z.output<typeof listNotificationsQuerySchema>;

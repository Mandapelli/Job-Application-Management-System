import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Every successful response has the shape { success: true, message?, data, meta? }. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; message?: string; meta?: PaginationMeta } = {},
) {
  const { status = 200, message, meta } = options;
  return res.status(status).json({ success: true, message, data, meta });
}

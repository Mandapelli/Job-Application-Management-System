import { z } from 'zod';
import { InterviewResult, InterviewStatus, InterviewType } from '../generated/prisma/client.js';
import { optText, optUrl, paginationQuery } from './common.js';

// Accepts an ISO timestamp with timezone, e.g. "2026-12-12T12:00:00.000Z" (the browser converts local time to this).
const dateTime = z.iso
  .datetime({ offset: true, error: 'Use an ISO date-time, e.g. 2026-12-12T12:00:00Z' })
  .transform((s) => new Date(s));

const shared = {
  round: z.number().int().min(1).max(20),
  type: z.enum(InterviewType),
  scheduledAt: dateTime,
  durationMinutes: z.number().int().min(5).max(1440),
  location: optText(255),
  meetingUrl: optUrl,
  interviewerName: optText(100),
  status: z.enum(InterviewStatus),
  result: z.enum(InterviewResult),
  feedback: optText(20_000),
  notes: optText(20_000),
};

export const createInterviewSchema = z.object({
  applicationId: z.uuid(),
  ...shared,
  round: shared.round.default(1),
  type: shared.type.default('VIDEO'),
  durationMinutes: shared.durationMinutes.default(60),
  status: shared.status.default('SCHEDULED'),
  result: shared.result.default('PENDING'),
});

// The application an interview belongs to cannot be changed after creation.
export const updateInterviewSchema = z
  .object(shared)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listInterviewsQuerySchema = z.object({
  ...paginationQuery,
  search: z.string().trim().max(100).optional(),
  status: z.enum(InterviewStatus).optional(),
  result: z.enum(InterviewResult).optional(),
  applicationId: z.uuid().optional(),
  when: z.enum(['upcoming', 'past']).optional(),
  sortBy: z.enum(['scheduledAt', 'createdAt']).default('scheduledAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateInterviewInput = z.output<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.output<typeof updateInterviewSchema>;
export type ListInterviewsQuery = z.output<typeof listInterviewsQuerySchema>;

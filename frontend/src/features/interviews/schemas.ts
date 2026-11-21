import { z } from 'zod';
import {
  INTERVIEW_RESULTS,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
  type Interview,
  type InterviewPayload,
} from './types';

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label} must be a whole number`)
    .refine((v) => Number(v) >= min && Number(v) <= max, `${label} must be between ${min} and ${max}`);

// All form values are strings (that is what inputs give us); toInterviewPayload() converts them for the API.
export const interviewFormSchema = z.object({
  applicationId: z.string().min(1, 'Choose an application'),
  round: wholeNumber('Round', 1, 20),
  type: z.enum(INTERVIEW_TYPES),
  // <input type="datetime-local"> gives "2026-12-12T14:30" in the user's own timezone.
  scheduledAt: z
    .string()
    .min(1, 'Choose a date and time')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date and time'),
  durationMinutes: wholeNumber('Duration', 5, 1440),
  location: z.string().trim().max(255),
  meetingUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Must start with http:// or https://'),
  interviewerName: z.string().trim().max(100),
  status: z.enum(INTERVIEW_STATUSES),
  result: z.enum(INTERVIEW_RESULTS),
  feedback: z.string().max(20_000),
  notes: z.string().max(20_000),
});

export type InterviewFormValues = z.infer<typeof interviewFormSchema>;

export const emptyInterviewValues: InterviewFormValues = {
  applicationId: '',
  round: '1',
  type: 'VIDEO',
  scheduledAt: '',
  durationMinutes: '60',
  location: '',
  meetingUrl: '',
  interviewerName: '',
  status: 'SCHEDULED',
  result: 'PENDING',
  feedback: '',
  notes: '',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO timestamp -> the "YYYY-MM-DDTHH:mm" text a datetime-local input expects, in the viewer's timezone. */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const toInterviewFormValues = (i: Interview): InterviewFormValues => ({
  applicationId: i.applicationId,
  round: String(i.round),
  type: i.type,
  scheduledAt: toLocalInputValue(i.scheduledAt),
  durationMinutes: String(i.durationMinutes),
  location: i.location ?? '',
  meetingUrl: i.meetingUrl ?? '',
  interviewerName: i.interviewerName ?? '',
  status: i.status,
  result: i.result,
  feedback: i.feedback ?? '',
  notes: i.notes ?? '',
});

const text = (v: string) => (v.trim() === '' ? null : v.trim());

export function toInterviewPayload(v: InterviewFormValues, includeApplication: boolean): InterviewPayload {
  return {
    ...(includeApplication && { applicationId: v.applicationId }),
    round: Number(v.round),
    type: v.type,
    // new Date("2026-12-12T14:30") is read as local time; toISOString() sends it to the server as an exact moment.
    scheduledAt: new Date(v.scheduledAt).toISOString(),
    durationMinutes: Number(v.durationMinutes),
    location: text(v.location),
    meetingUrl: text(v.meetingUrl),
    interviewerName: text(v.interviewerName),
    status: v.status,
    result: v.result,
    feedback: text(v.feedback),
    notes: text(v.notes),
  };
}

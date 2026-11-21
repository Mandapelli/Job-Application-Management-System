import { badgeClass, type Tone } from '@/components/ui/badge-tones';
import {
  INTERVIEW_STATUS_LABELS,
  RESULT_LABELS,
  type InterviewResult,
  type InterviewStatus,
} from '../types';

const STATUS_TONE: Record<InterviewStatus, Tone> = { SCHEDULED: 'blue', COMPLETED: 'slate', CANCELLED: 'gray' };
const RESULT_TONE: Record<InterviewResult, Tone> = { PENDING: 'amber', PASSED: 'green', FAILED: 'red' };

export const InterviewStatusBadge = ({ status }: { status: InterviewStatus }) => (
  <span className={badgeClass(STATUS_TONE[status], status === 'CANCELLED' ? 'line-through' : undefined)}>
    {INTERVIEW_STATUS_LABELS[status]}
  </span>
);
export const ResultBadge = ({ result }: { result: InterviewResult }) => (
  <span className={badgeClass(RESULT_TONE[result])}>{RESULT_LABELS[result]}</span>
);

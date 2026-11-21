import { badgeClass, type Tone } from '@/components/ui/badge-tones';
import { STATUS_LABELS, type ApplicationStatus } from '../types';

export const STATUS_TONES: Record<ApplicationStatus, Tone> = {
  WISHLIST: 'slate',
  APPLIED: 'blue',
  SCREENING: 'violet',
  INTERVIEW: 'amber',
  OFFER: 'green',
  REJECTED: 'red',
  WITHDRAWN: 'gray',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={badgeClass(STATUS_TONES[status])}>{STATUS_LABELS[status]}</span>;
}

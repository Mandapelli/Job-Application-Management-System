import { badgeClass, type Tone } from '@/components/ui/badge-tones';
import { PRIORITY_LABELS, type TaskPriority } from '../types';

const TONE: Record<TaskPriority, Tone> = { LOW: 'slate', MEDIUM: 'blue', HIGH: 'red' };

export const PriorityBadge = ({ priority }: { priority: TaskPriority }) => (
  <span className={badgeClass(TONE[priority])}>{PRIORITY_LABELS[priority]}</span>
);

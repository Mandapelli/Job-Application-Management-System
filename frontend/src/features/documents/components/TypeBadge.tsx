import { badgeClass, type Tone } from '@/components/ui/badge-tones';
import { TYPE_LABELS, type DocumentType } from '../types';

const TONE: Record<DocumentType, Tone> = { RESUME: 'blue', COVER_LETTER: 'violet', OTHER: 'slate' };

export const TypeBadge = ({ type }: { type: DocumentType }) => (
  <span className={badgeClass(TONE[type])}>{TYPE_LABELS[type]}</span>
);

import { cn } from '@/lib/utils';

/**
 * Colour sets for the small pill badges (status, priority, type...). Each has a light-theme and a dark-theme look.
 * In dark mode the fill is a translucent tint of the same hue, with light text, so it reads well on dark cards.
 */
export const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/25',
  gray: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-400/15 dark:text-gray-400 dark:ring-gray-400/25',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/30',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/30',
  green: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-400/15 dark:text-green-300 dark:ring-green-400/30',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-400/15 dark:text-red-300 dark:ring-red-400/30',
} as const;

export type Tone = keyof typeof TONES;

/** Classes for a pill badge in the given tone. */
export const badgeClass = (tone: Tone, extra?: string) =>
  cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], extra);

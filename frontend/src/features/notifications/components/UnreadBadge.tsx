import { cn } from '@/lib/utils';

/** Small count pill. Shows nothing at zero, and "99+" for big numbers. */
export function UnreadBadge({ count, className }: { count: number | undefined; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-5 text-destructive-foreground',
        className,
      )}
    >
      <span aria-hidden>{count > 99 ? '99+' : count}</span>
      <span className="sr-only">{count} unread</span>
    </span>
  );
}

/** "2026-11-01T00:00:00.000Z" -> "1 Nov 2026". Uses UTC because the API stores a calendar date, not a moment. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** A real moment in time (e.g. when a status changed), shown in the viewer's own timezone. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "just now", "5 min ago", "3 hours ago", "2 days ago"; older than a week falls back to a date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 8) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSalary(min: number | null, max: number | null, currency: string): string {
  if (min == null && max == null) return '—';
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  return min != null ? `From ${fmt(min)}` : `Up to ${fmt(max as number)}`;
}

import type { DashboardSummary } from '../types';

const ROWS = [
  {
    key: 'response',
    label: 'Response rate',
    help: 'Applications that got any reply (screening, interview, offer or rejection).',
  },
  {
    key: 'interview',
    label: 'Interview rate',
    help: 'Applications that led to at least one interview.',
  },
  { key: 'offer', label: 'Offer rate', help: 'Applications that ended in an offer.' },
] as const;

/** Three ratios, each against the number of applications you actually submitted (wishlist items don't count). */
export function RateMeters({ rates, submitted }: { rates: DashboardSummary['rates']; submitted: number }) {
  return (
    <div className="space-y-5">
      {ROWS.map(({ key, label, help }) => {
        const value = rates[key];
        const pct = value == null ? null : Math.round(value * 100);
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-sm font-semibold">{pct == null ? '—' : `${pct}%`}</p>
            </div>
            <div
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct ?? 0}
              aria-valuetext={pct == null ? 'No data yet' : `${pct}%`}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full" style={{ width: `${pct ?? 0}%`, background: 'var(--chart-1)' }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Based on {submitted} submitted application{submitted === 1 ? '' : 's'}.
      </p>
    </div>
  );
}

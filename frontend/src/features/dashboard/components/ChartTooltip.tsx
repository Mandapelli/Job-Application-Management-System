/** Hover readout shared by the charts: the value leads, the label follows. Text is rendered by React (escaped), never as HTML. */
export function ChartTooltip({
  active,
  payload,
  title,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: { tooltipTitle?: string } }[];
  title?: string;
  unit: string;
}) {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-muted-foreground">{item.payload?.tooltipTitle ?? title}</p>
      <p className="mt-0.5 flex items-center gap-2">
        <span className="h-0.5 w-3 rounded" style={{ background: 'var(--chart-1)' }} aria-hidden />
        <strong>{item.value}</strong> <span className="text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

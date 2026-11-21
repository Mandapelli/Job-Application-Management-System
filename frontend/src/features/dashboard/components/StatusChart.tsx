import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { STATUSES, STATUS_LABELS, type ApplicationStatus } from '@/features/applications/types';
import { ChartTooltip } from './ChartTooltip';

/** Applications per status, in pipeline order. One hue: the status name on the axis carries identity, the bar length carries the count. */
export function StatusChart({ byStatus }: { byStatus: Record<ApplicationStatus, number> }) {
  const data = STATUSES.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    count: byStatus[s],
    tooltipTitle: `${STATUS_LABELS[s]} applications`,
  }));

  return (
    <figure>
      <div role="img" aria-label="Bar chart of applications by status">
        <ResponsiveContainer width="100%" height={STATUSES.length * 38 + 8}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={10}>
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="label"
              width={84}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-axis)', fontSize: 13 }}
            />
            <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} content={<ChartTooltip unit="applications" />} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={16} minPointSize={2}>
              <LabelList dataKey="count" position="right" fill="var(--chart-axis)" fontSize={13} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Table view: the same numbers for screen readers (and anyone who cannot use hover). */}
      <table className="sr-only">
        <caption>Applications by status</caption>
        <thead>
          <tr>
            <th>Status</th>
            <th>Applications</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.status}>
              <td>{d.label}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

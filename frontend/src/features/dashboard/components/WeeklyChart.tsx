import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

const shortDate = (weekStart: string) =>
  new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Applications per week for the last 8 weeks (weeks start on Monday). */
export function WeeklyChart({ weekly }: { weekly: { weekStart: string; count: number }[] }) {
  const data = weekly.map((w) => ({
    label: shortDate(w.weekStart),
    count: w.count,
    tooltipTitle: `Week of ${shortDate(w.weekStart)}`,
  }));

  return (
    <figure>
      <div role="img" aria-label="Column chart of applications per week over the last 8 weeks">
        <ResponsiveContainer width="100%" height={266}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
              width={40}
            />
            <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} content={<ChartTooltip unit="applications" />} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Applications per week</caption>
        <thead>
          <tr>
            <th>Week of</th>
            <th>Applications</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

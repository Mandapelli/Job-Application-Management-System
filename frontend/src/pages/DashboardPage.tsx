import { Briefcase, CalendarDays, Gift, ListTodo, Percent } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/StateMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import {
  OpenTasksList,
  RecentApplicationsList,
  UpcomingInterviewsList,
} from '@/features/dashboard/components/DashboardLists';
import { RateMeters } from '@/features/dashboard/components/RateMeters';
import { StatTile } from '@/features/dashboard/components/StatTile';
import { StatusChart } from '@/features/dashboard/components/StatusChart';
import { WeeklyChart } from '@/features/dashboard/components/WeeklyChart';
import { useDashboardSummary } from '@/features/dashboard/hooks';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: { to: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {action && (
          <Link to={action.to} className="text-sm font-medium text-primary hover:underline">
            {action.label}
          </Link>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);

export function DashboardPage() {
  const { user } = useAuth();
  const query = useDashboardSummary();
  const d = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">Here is an overview of your job search.</p>
      </div>

      {query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <Card>
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        </Card>
      ) : (
        // While refreshing, the previous numbers stay on screen, slightly dimmed (no layout jump).
        <div className={cn('space-y-6 transition-opacity', query.isFetching && 'opacity-70')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatTile
              label="Applications"
              value={String(d!.totals.applications)}
              note={`${d!.thisWeek} this week · ${d!.lastWeek} last week`}
              icon={Briefcase}
            />
            <StatTile
              label="Interviews"
              value={String(d!.interviews.total)}
              note={`${d!.interviews.upcoming} upcoming · ${d!.interviews.completed} completed`}
              icon={CalendarDays}
            />
            <StatTile
              label="Offers"
              value={String(d!.totals.offers)}
              note={d!.totals.submitted ? `of ${d!.totals.submitted} submitted` : 'Nothing submitted yet'}
              icon={Gift}
            />
            <StatTile
              label="Response rate"
              value={pct(d!.rates.response)}
              note={d!.totals.submitted ? `of ${d!.totals.submitted} submitted` : 'Nothing submitted yet'}
              icon={Percent}
            />
            <StatTile
              label="Open tasks"
              value={String(d!.tasks.pending + d!.tasks.overdue)}
              note={d!.tasks.overdue > 0 ? `${d!.tasks.overdue} overdue` : 'None overdue'}
              icon={ListTodo}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Applications by status" action={{ to: '/applications?view=kanban', label: 'Open board' }}>
              <StatusChart byStatus={d!.byStatus} />
            </Panel>
            <Panel title="Applications per week (last 8 weeks)">
              <WeeklyChart weekly={d!.weekly} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Upcoming interviews" action={{ to: '/interviews', label: 'View all' }}>
              <UpcomingInterviewsList items={d!.upcomingInterviews} />
            </Panel>
            <Panel title="Tasks to do" action={{ to: '/tasks', label: 'View all' }}>
              <OpenTasksList items={d!.openTasks} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Conversion">
              <RateMeters rates={d!.rates} submitted={d!.totals.submitted} />
            </Panel>
            <Panel title="Recent applications" action={{ to: '/applications', label: 'View all' }}>
              <RecentApplicationsList items={d!.recentApplications} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

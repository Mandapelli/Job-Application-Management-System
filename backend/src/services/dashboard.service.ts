import { dashboardRepository } from '../repositories/dashboard.repository.js';
import { taskRepository } from '../repositories/task.repository.js';

const STATUSES = ['WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'] as const;
const WEEKS = 8;
const DAY = 86_400_000;

/** Monday 00:00 UTC of the week containing `date`. */
function mondayOf(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
}

/** part / whole as 0..1, or null when there is nothing to divide by (so the UI can show "—", not 0%). */
const ratio = (part: number, whole: number) => (whole === 0 ? null : part / whole);

export const dashboardService = {
  async summary(userId: string) {
    const thisMonday = mondayOf(new Date());
    const firstMonday = new Date(thisMonday.getTime() - (WEEKS - 1) * 7 * DAY);

    const [
      statusRows,
      interviews,
      withInterview,
      weeklyRows,
      recentApplications,
      upcomingInterviews,
      tasks,
      openTasks,
    ] = await Promise.all([
      dashboardRepository.statusCounts(userId),
      dashboardRepository.interviewCounts(userId),
      dashboardRepository.applicationsWithInterview(userId),
      dashboardRepository.weeklyCounts(userId, firstMonday),
      dashboardRepository.recentApplications(userId, 5),
      dashboardRepository.upcomingInterviews(userId, 5),
      taskRepository.counts(userId),
      dashboardRepository.openTasks(userId, 5),
    ]);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<(typeof STATUSES)[number], number>;
    for (const row of statusRows) byStatus[row.status] = row._count._all;
    const total = STATUSES.reduce((sum, s) => sum + byStatus[s], 0);

    // "Submitted" = actually applied (anything except a wishlist idea).
    const submitted = total - byStatus.WISHLIST;
    const responded = byStatus.SCREENING + byStatus.INTERVIEW + byStatus.OFFER + byStatus.REJECTED;

    // One entry per week for the last 8 weeks, including weeks with zero applications.
    const byWeek = new Map(weeklyRows.map((r) => [r.weekStart.toISOString().slice(0, 10), r.count]));
    const weekly = Array.from({ length: WEEKS }, (_, i) => {
      const weekStart = new Date(firstMonday.getTime() + i * 7 * DAY).toISOString().slice(0, 10);
      return { weekStart, count: byWeek.get(weekStart) ?? 0 };
    });

    return {
      totals: { applications: total, submitted, offers: byStatus.OFFER },
      byStatus,
      interviews,
      // Shares of submitted applications. Definitions are shown in the UI tooltips.
      rates: {
        response: ratio(responded, submitted), // got any reply: screening, interview, offer or rejection
        interview: ratio(withInterview, submitted), // had at least one (non-cancelled) interview
        offer: ratio(byStatus.OFFER, submitted),
      },
      weekly,
      thisWeek: weekly[WEEKS - 1]!.count,
      lastWeek: weekly[WEEKS - 2]!.count,
      recentApplications,
      upcomingInterviews,
      tasks: { pending: tasks.pending, overdue: tasks.overdue, completed: tasks.completed },
      openTasks,
    };
  },
};

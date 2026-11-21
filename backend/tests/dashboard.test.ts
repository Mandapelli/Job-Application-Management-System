import { describe, expect, it } from 'vitest';
import { api, bearer, createApplication, registerUser } from './helpers.js';

const URL = '/api/v1/dashboard/summary';
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const schedule = (token: string, applicationId: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/v1/interviews')
    .set(bearer(token))
    .send({ applicationId, scheduledAt: inDays(3), ...body });

describe('GET /dashboard/summary', () => {
  it('requires authentication', async () => {
    expect((await api().get(URL)).status).toBe(401);
  });

  it('returns zeros and null rates for a brand-new user', async () => {
    const { token } = await registerUser();
    const res = await api().get(URL).set(bearer(token));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totals).toEqual({ applications: 0, submitted: 0, offers: 0 });
    expect(Object.values(d.byStatus).every((n) => n === 0)).toBe(true);
    expect(Object.keys(d.byStatus)).toHaveLength(7);
    expect(d.rates).toEqual({ response: null, interview: null, offer: null }); // not 0%: nothing to measure yet
    expect(d.interviews).toEqual({ total: 0, completed: 0, passed: 0, upcoming: 0 });
    expect(d.weekly).toHaveLength(8);
    expect(d.weekly.every((w: { count: number }) => w.count === 0)).toBe(true);
    expect(d.recentApplications).toEqual([]);
    expect(d.upcomingInterviews).toEqual([]);
  });

  it('counts applications by status and computes the rates', async () => {
    const { token } = await registerUser();
    // 10 applications: 2 wishlist (not submitted), 8 submitted.
    for (const status of ['WISHLIST', 'WISHLIST', 'APPLIED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'REJECTED', 'WITHDRAWN']) {
      await createApplication(token, { status });
    }
    const d = (await api().get(URL).set(bearer(token))).body.data;
    expect(d.byStatus).toMatchObject({ WISHLIST: 2, APPLIED: 2, SCREENING: 1, INTERVIEW: 1, OFFER: 1, REJECTED: 2, WITHDRAWN: 1 });
    expect(d.totals).toEqual({ applications: 10, submitted: 8, offers: 1 });
    // responded = screening + interview + offer + rejected = 1+1+1+2 = 5 of 8
    expect(d.rates.response).toBeCloseTo(5 / 8);
    expect(d.rates.offer).toBeCloseTo(1 / 8);
    expect(d.rates.interview).toBe(0); // no interviews scheduled yet
  });

  it('counts interviews, and the interview rate uses distinct applications and ignores cancelled ones', async () => {
    const { token } = await registerUser();
    const a1 = await createApplication(token, { status: 'INTERVIEW' });
    const a2 = await createApplication(token, { status: 'APPLIED' });
    await createApplication(token, { status: 'APPLIED' });
    await createApplication(token, { status: 'APPLIED' });

    await schedule(token, a1.id, { round: 1 });
    await schedule(token, a1.id, { round: 2 }); // second interview, same application: counted once
    await schedule(token, a2.id, { status: 'CANCELLED' }); // cancelled: doesn't count toward the rate
    await schedule(token, a1.id, { scheduledAt: inDays(-5), status: 'COMPLETED', result: 'PASSED' });

    const d = (await api().get(URL).set(bearer(token))).body.data;
    expect(d.interviews).toEqual({ total: 4, completed: 1, passed: 1, upcoming: 2 });
    expect(d.rates.interview).toBeCloseTo(1 / 4); // 1 application of 4 submitted
  });

  it('lists the next upcoming interviews in date order, excluding past and cancelled ones', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    await schedule(token, app.id, { scheduledAt: inDays(9), round: 3 });
    await schedule(token, app.id, { scheduledAt: inDays(2), round: 1 });
    await schedule(token, app.id, { scheduledAt: inDays(5), round: 2 });
    await schedule(token, app.id, { scheduledAt: inDays(-1), round: 9 });
    await schedule(token, app.id, { scheduledAt: inDays(1), round: 8, status: 'CANCELLED' });

    const d = (await api().get(URL).set(bearer(token))).body.data;
    expect(d.upcomingInterviews.map((i: { round: number }) => i.round)).toEqual([1, 2, 3]);
    expect(d.upcomingInterviews[0].application).toMatchObject({ jobTitle: 'Backend Engineer', companyName: 'Acme Corp' });
    expect(d.upcomingInterviews[0]).not.toHaveProperty('feedback');
  });

  it('limits recent applications to 5, newest first', async () => {
    const { token } = await registerUser();
    for (let i = 1; i <= 7; i++) {
      await createApplication(token, { jobTitle: `Job ${i}` });
      await new Promise((r) => setTimeout(r, 15)); // distinct createdAt timestamps
    }
    const d = (await api().get(URL).set(bearer(token))).body.data;
    expect(d.recentApplications.map((a: { jobTitle: string }) => a.jobTitle)).toEqual(['Job 7', 'Job 6', 'Job 5', 'Job 4', 'Job 3']);
  });

  it('builds 8 weekly buckets ending with the current week, using the applied date', async () => {
    const { token } = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    const longAgo = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10);
    await createApplication(token, { appliedDate: today });
    await createApplication(token, { appliedDate: today });
    await createApplication(token, { appliedDate: twoWeeksAgo });
    await createApplication(token, { appliedDate: longAgo }); // outside the 8-week window

    const d = (await api().get(URL).set(bearer(token))).body.data;
    expect(d.weekly).toHaveLength(8);
    const days = d.weekly.map((w: { weekStart: string }) => new Date(w.weekStart).getUTCDay());
    expect(days.every((x: number) => x === 1)).toBe(true); // every bucket starts on a Monday
    expect(d.thisWeek).toBe(2);
    expect(d.weekly[5].count).toBe(1); // two weeks before the current (last) bucket
    expect(d.weekly.reduce((s: number, w: { count: number }) => s + w.count, 0)).toBe(3);
    expect(d.totals.applications).toBe(4); // the old one still counts in totals
  });

  it('reports task counts and lists open tasks most-urgent first (overdue, then soonest, undated last)', async () => {
    const { token } = await registerUser();
    const task = (body: Record<string, unknown>) => api().post('/api/v1/tasks').set(bearer(token)).send(body);
    await task({ title: 'No date' });
    await task({ title: 'Next week', dueAt: inDays(7) });
    await task({ title: 'Overdue', dueAt: inDays(-2) });
    await task({ title: 'Tomorrow', dueAt: inDays(1) });
    await task({ title: 'Finished', dueAt: inDays(-9), status: 'COMPLETED' });

    const d = (await api().get(URL).set(bearer(token))).body.data;
    expect(d.tasks).toEqual({ pending: 3, overdue: 1, completed: 1 });
    expect(d.openTasks.map((t: { title: string }) => t.title)).toEqual(['Overdue', 'Tomorrow', 'Next week', 'No date']);
    expect(d.openTasks[0]).not.toHaveProperty('description');
  });

  it('shows zero tasks for a new user', async () => {
    const { token } = await registerUser();
    const d = (await api().get(URL).set(bearer(token))).body.data;
    expect(d.tasks).toEqual({ pending: 0, overdue: 0, completed: 0 });
    expect(d.openTasks).toEqual([]);
  });

  it("never includes another user's data", async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const app = await createApplication(a.token, { status: 'OFFER' });
    await schedule(a.token, app.id);
    await api().post('/api/v1/tasks').set(bearer(a.token)).send({ title: 'A only', dueAt: inDays(-1) });

    const d = (await api().get(URL).set(bearer(b.token))).body.data;
    expect(d.totals.applications).toBe(0);
    expect(d.interviews.total).toBe(0);
    expect(d.recentApplications).toEqual([]);
    expect(d.upcomingInterviews).toEqual([]);
    expect(d.tasks.pending + d.tasks.overdue + d.tasks.completed).toBe(0);
  });
});

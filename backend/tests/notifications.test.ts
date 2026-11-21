import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { notificationService } from '../src/services/notification.service.js';
import { api, bearer, createApplication, registerUser } from './helpers.js';

const URL = '/api/v1/notifications';
const HOUR = 3_600_000;
const inHours = (h: number) => new Date(Date.now() + h * HOUR).toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const makeInterview = async (token: string, applicationId: string, body: Record<string, unknown> = {}) =>
  (await api().post('/api/v1/interviews').set(bearer(token)).send({ applicationId, scheduledAt: inHours(3), ...body })).body.data as {
    id: string;
    [k: string]: any;
  };
const makeTask = async (token: string, body: Record<string, unknown> = {}) =>
  (await api().post('/api/v1/tasks').set(bearer(token)).send({ title: 'Follow up', ...body })).body.data as {
    id: string;
    [k: string]: any;
  };
const list = async (token: string, query = '') => (await api().get(`${URL}${query}`).set(bearer(token))).body;
const titles = async (token: string) => (await list(token)).data.map((n: { title: string }) => n.title);

describe('authentication', () => {
  it('rejects every endpoint without a token', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    for (const [method, path] of [
      ['get', URL],
      ['get', `${URL}/unread-count`],
      ['post', `${URL}/read-all`],
      ['patch', `${URL}/${id}`],
      ['delete', `${URL}/${id}`],
    ] as const) {
      expect((await api()[method](path)).status, `${method} ${path}`).toBe(401);
    }
  });
});

describe('interview reminders', () => {
  it('creates a reminder for an interview in the next 24 hours', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token, { companyName: 'Acme Corp', jobTitle: 'Backend Engineer' });
    const when = inHours(3);
    const iv = await makeInterview(token, app.id, { scheduledAt: when, round: 2 });

    expect(await notificationService.generateDue()).toBe(1);
    const [n] = (await list(token)).data;
    expect(n).toMatchObject({
      type: 'INTERVIEW_REMINDER',
      title: 'Interview in the next 24 hours',
      message: 'Backend Engineer at Acme Corp (round 2)',
      link: `/interviews/${iv.id}`,
      interviewId: iv.id,
      readAt: null,
    });
    expect(new Date(n.eventAt).toISOString()).toBe(when);
    expect(n).not.toHaveProperty('dedupeKey');
  });

  it('uses the "within the hour" wording when it is that close', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    await makeInterview(token, app.id, { scheduledAt: inHours(0.5) });
    await notificationService.generateDue();
    expect(await titles(token)).toEqual(['Interview starting within the hour']);
  });

  it('creates nothing for interviews that are too far away, in the past, cancelled or completed', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    await makeInterview(token, app.id, { scheduledAt: inHours(72) });
    await makeInterview(token, app.id, { scheduledAt: inHours(-5) });
    await makeInterview(token, app.id, { scheduledAt: inHours(2), status: 'CANCELLED' });
    await makeInterview(token, app.id, { scheduledAt: inHours(2), status: 'COMPLETED' });
    expect(await notificationService.generateDue()).toBe(0);
    expect((await list(token)).meta.total).toBe(0);
  });

  it('never creates the same reminder twice, however often the job runs', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    await makeInterview(token, app.id);
    const runs = [await notificationService.generateDue(), await notificationService.generateDue(), await notificationService.generateDue()];
    expect(runs).toEqual([1, 0, 0]);
    expect((await list(token)).meta.total).toBe(1);
  });

  it('two jobs running at the same moment still create only one reminder', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    await makeInterview(token, app.id);
    await Promise.all([notificationService.generateDue(), notificationService.generateDue(), notificationService.generateDue()]);
    expect((await list(token)).meta.total).toBe(1);
  });

  it('sends a second reminder when the interview gets within the hour', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    await makeInterview(token, app.id, { scheduledAt: inHours(3) });
    await notificationService.generateDue();
    // Two and a half hours later, the interview is 30 minutes away.
    await notificationService.generateDue(new Date(Date.now() + 2.5 * HOUR));
    expect((await titles(token)).sort()).toEqual(['Interview in the next 24 hours', 'Interview starting within the hour']);
  });

  it('rescheduling removes the old unread reminder and creates a new one', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await makeInterview(token, app.id, { scheduledAt: inHours(3) });
    await notificationService.generateDue();
    expect((await list(token)).meta.total).toBe(1);

    const newTime = inHours(6);
    await api().patch(`/api/v1/interviews/${iv.id}`).set(bearer(token)).send({ scheduledAt: newTime });
    expect((await list(token)).meta.total).toBe(0);

    await notificationService.generateDue();
    const [n] = (await list(token)).data;
    expect(new Date(n.eventAt).toISOString()).toBe(newTime);
  });

  it('rescheduling keeps reminders you already read, as history', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await makeInterview(token, app.id, { scheduledAt: inHours(3) });
    await notificationService.generateDue();
    const [n] = (await list(token)).data;
    await api().patch(`${URL}/${n.id}`).set(bearer(token)).send({ read: true });

    await api().patch(`/api/v1/interviews/${iv.id}`).set(bearer(token)).send({ scheduledAt: inHours(6) });
    await notificationService.generateDue();
    expect((await list(token)).meta.total).toBe(2);
  });

  it('cancelling or completing an interview removes its unread reminder', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await makeInterview(token, app.id);
    await notificationService.generateDue();
    await api().patch(`/api/v1/interviews/${iv.id}`).set(bearer(token)).send({ status: 'CANCELLED' });
    expect((await list(token)).meta.total).toBe(0);
  });

  it('editing other details (even re-sending the same time) keeps the reminder', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const when = inHours(3);
    const iv = await makeInterview(token, app.id, { scheduledAt: when });
    await notificationService.generateDue();
    const before = (await list(token)).data[0];

    await api().patch(`/api/v1/interviews/${iv.id}`).set(bearer(token)).send({ scheduledAt: when, notes: 'Bring laptop' });
    const after = (await list(token)).data;
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before.id);
  });

  it('deleting the interview deletes its notifications', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await makeInterview(token, app.id);
    await notificationService.generateDue();
    await api().delete(`/api/v1/interviews/${iv.id}`).set(bearer(token));
    expect(await prisma.notification.count()).toBe(0);
  });
});

describe('task reminders', () => {
  it('creates due-soon and overdue reminders, and ignores everything else', async () => {
    const { token } = await registerUser();
    await makeTask(token, { title: 'Due soon', dueAt: inHours(5) });
    await makeTask(token, { title: 'Overdue', dueAt: inHours(-48) });
    await makeTask(token, { title: 'Overdue long ago', dueAt: inHours(-24 * 10) }); // past the 7-day lookback
    await makeTask(token, { title: 'Far away', dueAt: inHours(24 * 3) });
    await makeTask(token, { title: 'No date' });
    await makeTask(token, { title: 'Already done', dueAt: inHours(5), status: 'COMPLETED' });
    await makeTask(token, { title: 'Done and overdue', dueAt: inHours(-5), status: 'COMPLETED' });

    expect(await notificationService.generateDue()).toBe(2);
    const items = (await list(token)).data as { title: string; message: string; type: string; link: string }[];
    expect(items.map((n) => `${n.type}:${n.message}`).sort()).toEqual(['TASK_DUE:Due soon', 'TASK_OVERDUE:Overdue']);
    expect(items.find((n) => n.type === 'TASK_DUE')!.title).toBe('Task due soon');
    expect(items.find((n) => n.type === 'TASK_OVERDUE')!.title).toBe('Task overdue');
    expect(items[0]!.link).toMatch(/^\/tasks\/[0-9a-f-]{36}\/edit$/);
  });

  it('mentions the company for tasks linked to an application', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token, { companyName: 'Globex' });
    await makeTask(token, { title: 'Send thank-you', dueAt: inHours(2), applicationId: app.id });
    await notificationService.generateDue();
    expect((await list(token)).data[0].message).toBe('Send thank-you (Globex)');
  });

  it('a task gets a due-soon reminder first and an overdue reminder later', async () => {
    const { token } = await registerUser();
    await makeTask(token, { title: 'Call back', dueAt: inHours(5) });
    await notificationService.generateDue();
    await notificationService.generateDue(new Date(Date.now() + 6 * HOUR)); // now it is an hour past due
    expect((await titles(token)).sort()).toEqual(['Task due soon', 'Task overdue']);
  });

  it('completing a task removes its unread reminder; reopening brings it back', async () => {
    const { token } = await registerUser();
    const t = await makeTask(token, { dueAt: inHours(5) });
    await notificationService.generateDue();
    expect((await list(token)).meta.total).toBe(1);

    await api().patch(`/api/v1/tasks/${t.id}`).set(bearer(token)).send({ status: 'COMPLETED' });
    expect((await list(token)).meta.total).toBe(0);
    await notificationService.generateDue();
    expect((await list(token)).meta.total).toBe(0); // completed tasks get no reminders

    await api().patch(`/api/v1/tasks/${t.id}`).set(bearer(token)).send({ status: 'PENDING' });
    await notificationService.generateDue();
    expect((await list(token)).meta.total).toBe(1);
  });

  it('changing the due date replaces the old unread reminder', async () => {
    const { token } = await registerUser();
    const t = await makeTask(token, { dueAt: inHours(5) });
    await notificationService.generateDue();
    await api().patch(`/api/v1/tasks/${t.id}`).set(bearer(token)).send({ dueAt: inHours(10) });
    expect((await list(token)).meta.total).toBe(0);
    await notificationService.generateDue();
    expect((await list(token)).meta.total).toBe(1);

    await api().patch(`/api/v1/tasks/${t.id}`).set(bearer(token)).send({ dueAt: null });
    expect((await list(token)).meta.total).toBe(0);
  });

  it('deleting the task deletes its notifications', async () => {
    const { token } = await registerUser();
    const t = await makeTask(token, { dueAt: inHours(5) });
    await notificationService.generateDue();
    await api().delete(`/api/v1/tasks/${t.id}`).set(bearer(token));
    expect(await prisma.notification.count()).toBe(0);
  });
});

describe('the reminder job at scale and across users', () => {
  it('handles more candidates than one batch (520 tasks), creating each reminder once', async () => {
    const { user } = await registerUser();
    const dueAt = new Date(Date.now() + 5 * HOUR);
    await prisma.task.createMany({
      data: Array.from({ length: 520 }, (_, i) => ({ userId: user.id, title: `Task ${i}`, dueAt })),
    });
    expect(await notificationService.generateDue()).toBe(520);
    expect(await notificationService.generateDue()).toBe(0);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(520);
  });

  it('each user only gets reminders for their own interviews and tasks', async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const appA = await createApplication(a.token);
    await makeInterview(a.token, appA.id);
    await makeTask(a.token, { dueAt: inHours(2) });
    await makeTask(b.token, { dueAt: inHours(2), title: 'B task' });

    await notificationService.generateDue();
    expect((await list(a.token)).meta.total).toBe(2);
    const bItems = (await list(b.token)).data;
    expect(bItems).toHaveLength(1);
    expect(bItems[0].message).toBe('B task');
  });

  it('purges old read notifications but keeps unread and recent ones', async () => {
    const { user } = await registerUser();
    const old = new Date(Date.now() - 100 * 24 * HOUR);
    const row = (key: string, extra: Record<string, unknown>) => ({
      userId: user.id, type: 'TASK_DUE' as const, title: 't', message: 'm', dedupeKey: key, ...extra,
    });
    await prisma.notification.createMany({
      data: [
        row('old-read', { createdAt: old, readAt: old }),
        row('old-unread', { createdAt: old }),
        row('recent-read', { readAt: new Date() }),
      ],
    });
    expect(await notificationService.purgeOld()).toBe(1);
    const left = (await prisma.notification.findMany()).map((n) => n.dedupeKey).sort();
    expect(left).toEqual(['old-unread', 'recent-read']);
  });
});

describe('reading and managing notifications', () => {
  async function seed(token: string, count: number) {
    for (let i = 1; i <= count; i++) {
      await makeTask(token, { title: `Task ${i}`, dueAt: inHours(5) });
      await notificationService.generateDue();
      await sleep(15); // distinct timestamps so "newest first" is well-defined
    }
  }

  it('lists newest first with paging, and counts unread', async () => {
    const { token } = await registerUser();
    await seed(token, 3);
    const res = await list(token);
    expect(res.data.map((n: { message: string }) => n.message)).toEqual(['Task 3', 'Task 2', 'Task 1']);
    expect(res.meta).toEqual({ page: 1, limit: 10, total: 3, totalPages: 1 });

    const p2 = await list(token, '?limit=2&page=2');
    expect(p2.data.map((n: { message: string }) => n.message)).toEqual(['Task 1']);
    expect(p2.meta).toMatchObject({ total: 3, totalPages: 2 });

    expect((await api().get(`${URL}/unread-count`).set(bearer(token))).body.data).toEqual({ count: 3 });
  });

  it('marks one notification read and unread again', async () => {
    const { token } = await registerUser();
    await seed(token, 2);
    const [first] = (await list(token)).data;

    const read = await api().patch(`${URL}/${first.id}`).set(bearer(token)).send({ read: true });
    expect(read.status).toBe(200);
    expect(read.body.data.readAt).not.toBeNull();
    expect((await api().get(`${URL}/unread-count`).set(bearer(token))).body.data.count).toBe(1);
    expect((await list(token, '?unread=true')).data).toHaveLength(1);
    expect((await list(token, '?unread=false')).data).toHaveLength(1);

    const unread = await api().patch(`${URL}/${first.id}`).set(bearer(token)).send({ read: false });
    expect(unread.body.data.readAt).toBeNull();
    expect((await api().get(`${URL}/unread-count`).set(bearer(token))).body.data.count).toBe(2);
  });

  it('marks everything read in one go', async () => {
    const { token } = await registerUser();
    await seed(token, 3);
    const res = await api().post(`${URL}/read-all`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ updated: 3 });
    expect((await api().get(`${URL}/unread-count`).set(bearer(token))).body.data.count).toBe(0);
    expect((await api().post(`${URL}/read-all`).set(bearer(token))).body.data).toEqual({ updated: 0 });
  });

  it('deletes a notification', async () => {
    const { token } = await registerUser();
    await seed(token, 2);
    const [first] = (await list(token)).data;
    expect((await api().delete(`${URL}/${first.id}`).set(bearer(token))).status).toBe(200);
    expect((await list(token)).meta.total).toBe(1);
  });

  it('rejects invalid input and unknown ids', async () => {
    const { token } = await registerUser();
    await seed(token, 1);
    const [first] = (await list(token)).data;
    expect((await api().patch(`${URL}/${first.id}`).set(bearer(token)).send({})).status).toBe(400);
    expect((await api().patch(`${URL}/${first.id}`).set(bearer(token)).send({ read: 'yes' })).status).toBe(400);
    for (const q of ['limit=1000', 'page=0', 'unread=maybe']) {
      expect((await api().get(`${URL}?${q}`).set(bearer(token))).status, q).toBe(400);
    }
    const unknown = '11111111-1111-4111-8111-111111111111';
    expect((await api().patch(`${URL}/${unknown}`).set(bearer(token)).send({ read: true })).status).toBe(404);
    expect((await api().delete(`${URL}/${unknown}`).set(bearer(token))).status).toBe(404);
    expect((await api().delete(`${URL}/not-a-uuid`).set(bearer(token))).status).toBe(404);
  });

  it("never exposes or changes another user's notifications", async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    await seed(a.token, 2);
    const [mine] = (await list(a.token)).data;

    expect((await list(b.token)).meta.total).toBe(0);
    expect((await api().get(`${URL}/unread-count`).set(bearer(b.token))).body.data.count).toBe(0);
    expect((await api().patch(`${URL}/${mine.id}`).set(bearer(b.token)).send({ read: true })).status).toBe(404);
    expect((await api().delete(`${URL}/${mine.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await api().post(`${URL}/read-all`).set(bearer(b.token))).body.data).toEqual({ updated: 0 });

    const row = await prisma.notification.findUniqueOrThrow({ where: { id: mine.id } });
    expect(row.readAt).toBeNull();
    expect((await api().get(`${URL}/unread-count`).set(bearer(a.token))).body.data.count).toBe(2);
  });
});

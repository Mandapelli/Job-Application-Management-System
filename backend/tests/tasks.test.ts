import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, bearer, createApplication, registerUser } from './helpers.js';

const URL = '/api/v1/tasks';
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

async function createTask(token: string, body: Record<string, unknown> = {}) {
  const res = await api()
    .post(URL)
    .set(bearer(token))
    .send({ title: 'Follow up with recruiter', ...body });
  return res.body.data as { id: string; [k: string]: any };
}

describe('authentication', () => {
  it('rejects every endpoint without a token', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    for (const [method, path] of [
      ['get', URL],
      ['get', `${URL}/summary`],
      ['post', URL],
      ['get', `${URL}/${id}`],
      ['patch', `${URL}/${id}`],
      ['delete', `${URL}/${id}`],
    ] as const) {
      expect((await api()[method](path)).status, `${method} ${path}`).toBe(401);
    }
  });
});

describe('create', () => {
  it('creates a task with defaults (medium priority, pending, no due date)', async () => {
    const { token, user } = await registerUser();
    const res = await api().post(URL).set(bearer(token)).send({ title: '  Send thank-you email  ' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: user.id,
      title: 'Send thank-you email',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueAt: null,
      completedAt: null,
      applicationId: null,
      description: null,
    });
  });

  it('links to an application and stores due date and priority', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const due = inDays(2);
    const res = await api()
      .post(URL)
      .set(bearer(token))
      .send({ title: 'Follow up', applicationId: app.id, dueAt: due, priority: 'HIGH', description: '' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      priority: 'HIGH',
      description: null,
      application: { id: app.id, jobTitle: 'Backend Engineer', companyName: 'Acme Corp' },
    });
    expect(new Date(res.body.data.dueAt).toISOString()).toBe(due);
  });

  it('a task created as completed gets a completion time', async () => {
    const { token } = await registerUser();
    const res = await api().post(URL).set(bearer(token)).send({ title: 'Already done', status: 'COMPLETED' });
    expect(res.body.data.completedAt).not.toBeNull();
  });

  it.each([
    ['missing title', { title: '' }, 'title'],
    ['title too long', { title: 'x'.repeat(201) }, 'title'],
    ['bad priority', { priority: 'URGENT' }, 'priority'],
    ['bad status', { status: 'DONE' }, 'status'],
    ['date without timezone', { dueAt: '2026-12-12T09:00:00' }, 'dueAt'],
    ['non-date due', { dueAt: 'soon' }, 'dueAt'],
    ['malformed applicationId', { applicationId: 'abc' }, 'applicationId'],
  ])('rejects %s with 400', async (_n, overrides, field) => {
    const { token } = await registerUser();
    const res = await api().post(URL).set(bearer(token)).send({ title: 'Task', ...overrides });
    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBeDefined();
  });

  it("rejects an unknown or another user's application with 400", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const app = await createApplication(a.token);
    for (const applicationId of [app.id, '11111111-1111-4111-8111-111111111111']) {
      const res = await api().post(URL).set(bearer(b.token)).send({ title: 'Task', applicationId });
      expect(res.status).toBe(400);
    }
  });
});

describe('pending, overdue and completed', () => {
  async function seed(token: string) {
    await createTask(token, { title: 'Late 1', dueAt: inDays(-3) });
    await createTask(token, { title: 'Late 2', dueAt: inDays(-1), priority: 'HIGH' });
    await createTask(token, { title: 'Soon', dueAt: inDays(2) });
    await createTask(token, { title: 'Someday' }); // no due date: pending, never overdue
    await createTask(token, { title: 'Done late', dueAt: inDays(-5), status: 'COMPLETED' }); // done, so not overdue
  }
  const titles = (res: { body: { data: { title: string }[] } }) => res.body.data.map((t) => t.title);

  it('classifies tasks: pending excludes overdue, completed tasks are never overdue', async () => {
    const { token } = await registerUser();
    await seed(token);
    expect(titles(await api().get(`${URL}?view=overdue`).set(bearer(token))).sort()).toEqual(['Late 1', 'Late 2']);
    expect(titles(await api().get(`${URL}?view=pending`).set(bearer(token))).sort()).toEqual(['Someday', 'Soon']);
    expect(titles(await api().get(`${URL}?view=completed`).set(bearer(token)))).toEqual(['Done late']);
    expect((await api().get(URL).set(bearer(token))).body.meta.total).toBe(5);
  });

  it('summary returns the counts for each state', async () => {
    const { token } = await registerUser();
    await seed(token);
    const res = await api().get(`${URL}/summary`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ pending: 2, overdue: 2, completed: 1, total: 5 });
  });

  it('completing an overdue task moves it out of overdue, reopening puts it back', async () => {
    const { token } = await registerUser();
    const t = await createTask(token, { dueAt: inDays(-2) });

    const done = await api().patch(`${URL}/${t.id}`).set(bearer(token)).send({ status: 'COMPLETED' });
    expect(done.body.data.status).toBe('COMPLETED');
    expect(done.body.data.completedAt).not.toBeNull();
    expect((await api().get(`${URL}/summary`).set(bearer(token))).body.data).toMatchObject({ overdue: 0, completed: 1 });

    const reopened = await api().patch(`${URL}/${t.id}`).set(bearer(token)).send({ status: 'PENDING' });
    expect(reopened.body.data.completedAt).toBeNull();
    expect((await api().get(`${URL}/summary`).set(bearer(token))).body.data).toMatchObject({ overdue: 1, completed: 0 });
  });
});

describe('list, search, filter, sort, pagination', () => {
  const titles = (res: { body: { data: { title: string }[] } }) => res.body.data.map((t) => t.title);

  it('sorts by due date with undated tasks last, in both directions', async () => {
    const { token } = await registerUser();
    await createTask(token, { title: 'No date' });
    await createTask(token, { title: 'Later', dueAt: inDays(9) });
    await createTask(token, { title: 'Sooner', dueAt: inDays(2) });
    expect(titles(await api().get(URL).set(bearer(token)))).toEqual(['Sooner', 'Later', 'No date']);
    expect(titles(await api().get(`${URL}?sortOrder=desc`).set(bearer(token)))).toEqual(['Later', 'Sooner', 'No date']);
  });

  it('sorts by priority', async () => {
    const { token } = await registerUser();
    await createTask(token, { title: 'Low', priority: 'LOW' });
    await createTask(token, { title: 'High', priority: 'HIGH' });
    await createTask(token, { title: 'Mid', priority: 'MEDIUM' });
    expect(titles(await api().get(`${URL}?sortBy=priority&sortOrder=desc`).set(bearer(token)))).toEqual(['High', 'Mid', 'Low']);
  });

  it('filters by priority and application, and searches title, notes and application', async () => {
    const { token } = await registerUser();
    const acme = await createApplication(token, { companyName: 'Acme Corp', jobTitle: 'Backend Engineer' });
    const globex = await createApplication(token, { companyName: 'Globex', jobTitle: 'Data Analyst' });
    await createTask(token, { title: 'Email Dana', applicationId: acme.id, priority: 'HIGH' });
    await createTask(token, { title: 'Prepare portfolio', applicationId: globex.id, description: 'include SQL samples' });
    await createTask(token, { title: 'Update resume' });

    expect(titles(await api().get(`${URL}?priority=HIGH`).set(bearer(token)))).toEqual(['Email Dana']);
    expect(titles(await api().get(`${URL}?applicationId=${globex.id}`).set(bearer(token)))).toEqual(['Prepare portfolio']);
    expect(titles(await api().get(`${URL}?search=dana`).set(bearer(token)))).toEqual(['Email Dana']);
    expect(titles(await api().get(`${URL}?search=sql`).set(bearer(token)))).toEqual(['Prepare portfolio']);
    expect(titles(await api().get(`${URL}?search=acme`).set(bearer(token)))).toEqual(['Email Dana']);
    expect(titles(await api().get(`${URL}?search=zzz`).set(bearer(token)))).toEqual([]);
  });

  it('combines a view with a search', async () => {
    const { token } = await registerUser();
    await createTask(token, { title: 'Late email', dueAt: inDays(-1) });
    await createTask(token, { title: 'Late call', dueAt: inDays(-1) });
    await createTask(token, { title: 'Future email', dueAt: inDays(4) });
    expect(titles(await api().get(`${URL}?view=overdue&search=email`).set(bearer(token)))).toEqual(['Late email']);
  });

  it('paginates without repeating items', async () => {
    const { token } = await registerUser();
    for (let n = 1; n <= 5; n++) await createTask(token, { title: `Task ${n}`, dueAt: inDays(n) });
    const p1 = await api().get(`${URL}?limit=3&page=1`).set(bearer(token));
    const p2 = await api().get(`${URL}?limit=3&page=2`).set(bearer(token));
    expect(p1.body.meta).toMatchObject({ total: 5, totalPages: 2 });
    const ids = [...p1.body.data, ...p2.body.data].map((t: { id: string }) => t.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('rejects invalid query values with 400', async () => {
    const { token } = await registerUser();
    for (const q of ['limit=1000', 'page=0', 'view=late', 'priority=URGENT', 'applicationId=abc', 'sortBy=description']) {
      expect((await api().get(`${URL}?${q}`).set(bearer(token))).status, q).toBe(400);
    }
  });
});

describe('details, update and delete', () => {
  it('updates fields, clears optional ones, and rejects empty updates', async () => {
    const { token } = await registerUser();
    const t = await createTask(token, { dueAt: inDays(3), description: 'old' });
    const res = await api()
      .patch(`${URL}/${t.id}`)
      .set(bearer(token))
      .send({ title: 'New title', dueAt: null, description: '', priority: 'LOW' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'New title', dueAt: null, description: null, priority: 'LOW' });
    expect((await api().patch(`${URL}/${t.id}`).set(bearer(token)).send({})).status).toBe(400);
  });

  it('returns details', async () => {
    const { token } = await registerUser();
    const t = await createTask(token, { description: 'Details here' });
    const res = await api().get(`${URL}/${t.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Details here');
  });

  it('deletes a task; deleting its application deletes its tasks', async () => {
    const { token } = await registerUser();
    const plain = await createTask(token);
    expect((await api().delete(`${URL}/${plain.id}`).set(bearer(token))).status).toBe(200);
    expect((await api().get(`${URL}/${plain.id}`).set(bearer(token))).status).toBe(404);

    const app = await createApplication(token);
    const linked = await createTask(token, { applicationId: app.id });
    await api().delete(`/api/v1/applications/${app.id}`).set(bearer(token));
    expect(await prisma.task.count({ where: { id: linked.id } })).toBe(0);
  });

  it('returns 404 for unknown or malformed ids', async () => {
    const { token } = await registerUser();
    expect((await api().delete(`${URL}/11111111-1111-4111-8111-111111111111`).set(bearer(token))).status).toBe(404);
    expect((await api().get(`${URL}/not-a-uuid`).set(bearer(token))).status).toBe(404);
  });
});

describe("another user's tasks", () => {
  it('are invisible and untouchable (404), and left unchanged', async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const t = await createTask(a.token, { title: 'Original' });

    expect((await api().get(URL).set(bearer(b.token))).body.meta.total).toBe(0);
    expect((await api().get(`${URL}/summary`).set(bearer(b.token))).body.data.total).toBe(0);
    expect((await api().get(`${URL}/${t.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await api().patch(`${URL}/${t.id}`).set(bearer(b.token)).send({ title: 'Hacked' })).status).toBe(404);
    expect((await api().delete(`${URL}/${t.id}`).set(bearer(b.token))).status).toBe(404);

    const row = await prisma.task.findUniqueOrThrow({ where: { id: t.id } });
    expect(row.title).toBe('Original');
  });
});

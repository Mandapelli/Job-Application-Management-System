import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, bearer, createApplication, registerUser } from './helpers.js';

const URL = '/api/v1/interviews';
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

async function createInterview(token: string, applicationId: string, body: Record<string, unknown> = {}) {
  const res = await api()
    .post(URL)
    .set(bearer(token))
    .send({ applicationId, scheduledAt: inDays(3), ...body });
  return res.body.data as { id: string; [k: string]: any };
}

describe('authentication', () => {
  it('rejects every endpoint without a token', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    for (const [method, path] of [
      ['get', URL],
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
  it('schedules an interview with sensible defaults', async () => {
    const { token, user } = await registerUser();
    const app = await createApplication(token);
    const when = inDays(2);
    const res = await api().post(URL).set(bearer(token)).send({ applicationId: app.id, scheduledAt: when });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: user.id,
      applicationId: app.id,
      round: 1,
      type: 'VIDEO',
      durationMinutes: 60,
      status: 'SCHEDULED',
      result: 'PENDING',
      location: null,
      application: { id: app.id, jobTitle: 'Backend Engineer', companyName: 'Acme Corp' },
    });
    expect(new Date(res.body.data.scheduledAt).toISOString()).toBe(when);
  });

  it('stores rounds, meeting link, interviewer and normalizes empty strings', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const res = await api()
      .post(URL)
      .set(bearer(token))
      .send({
        applicationId: app.id,
        scheduledAt: inDays(1),
        round: 2,
        type: 'TECHNICAL',
        durationMinutes: 90,
        meetingUrl: 'https://meet.example.com/abc',
        interviewerName: 'Dana',
        location: '',
        notes: 'Review system design',
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      round: 2,
      type: 'TECHNICAL',
      durationMinutes: 90,
      meetingUrl: 'https://meet.example.com/abc',
      interviewerName: 'Dana',
      location: null,
      notes: 'Review system design',
    });
  });

  it.each([
    ['missing date', { scheduledAt: undefined }, 'scheduledAt'],
    ['date without timezone', { scheduledAt: '2026-12-12T12:00:00' }, 'scheduledAt'],
    ['non-date text', { scheduledAt: 'tomorrow' }, 'scheduledAt'],
    ['round 0', { round: 0 }, 'round'],
    ['duration too short', { durationMinutes: 1 }, 'durationMinutes'],
    ['bad type', { type: 'COFFEE' }, 'type'],
    ['non-http meeting link', { meetingUrl: 'javascript:alert(1)' }, 'meetingUrl'],
  ])('rejects %s with 400', async (_n, overrides, field) => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const res = await api()
      .post(URL)
      .set(bearer(token))
      .send({ applicationId: app.id, scheduledAt: inDays(1), ...overrides });
    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBeDefined();
  });

  it("rejects an unknown application or another user's application with 400", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const app = await createApplication(a.token);
    for (const applicationId of [app.id, '11111111-1111-4111-8111-111111111111']) {
      const res = await api().post(URL).set(bearer(b.token)).send({ applicationId, scheduledAt: inDays(1) });
      expect(res.status).toBe(400);
    }
  });
});

describe('list, search, filter, sort, pagination', () => {
  async function seed(token: string) {
    const acme = await createApplication(token, { companyName: 'Acme Corp', jobTitle: 'Backend Engineer' });
    const globex = await createApplication(token, { companyName: 'Globex', jobTitle: 'Data Analyst' });
    await createInterview(token, acme.id, { scheduledAt: inDays(5), round: 1, interviewerName: 'Dana' });
    await createInterview(token, acme.id, { scheduledAt: inDays(10), round: 2 });
    await createInterview(token, globex.id, { scheduledAt: inDays(-3), status: 'COMPLETED', result: 'PASSED' });
    await createInterview(token, globex.id, { scheduledAt: inDays(-8), status: 'CANCELLED' });
    return { acme, globex };
  }
  const rounds = (res: { body: { data: { id: string }[] } }) => res.body.data.length;

  it('lists with meta, newest first, without feedback and notes', async () => {
    const { token } = await registerUser();
    await seed(token);
    const res = await api().get(URL).set(bearer(token));
    expect(res.status).toBe(200);
    expect(rounds(res)).toBe(4);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 4, totalPages: 1 });
    const dates = res.body.data.map((i: { scheduledAt: string }) => i.scheduledAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(res.body.data[0]).not.toHaveProperty('feedback');
    expect(res.body.data[0]).not.toHaveProperty('notes');
  });

  it('filters upcoming (scheduled and in the future) and past', async () => {
    const { token } = await registerUser();
    await seed(token);
    const up = await api().get(`${URL}?when=upcoming&sortOrder=asc`).set(bearer(token));
    expect(rounds(up)).toBe(2);
    expect(up.body.data.map((i: { round: number }) => i.round)).toEqual([1, 2]);
    expect(rounds(await api().get(`${URL}?when=past`).set(bearer(token)))).toBe(2);
  });

  it('a cancelled future interview is not "upcoming"', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    await createInterview(token, app.id, { scheduledAt: inDays(4), status: 'CANCELLED' });
    expect(rounds(await api().get(`${URL}?when=upcoming`).set(bearer(token)))).toBe(0);
  });

  it('filters by status, result and application, and searches', async () => {
    const { token } = await registerUser();
    const { acme } = await seed(token);
    expect(rounds(await api().get(`${URL}?status=COMPLETED`).set(bearer(token)))).toBe(1);
    expect(rounds(await api().get(`${URL}?result=PASSED`).set(bearer(token)))).toBe(1);
    expect(rounds(await api().get(`${URL}?applicationId=${acme.id}`).set(bearer(token)))).toBe(2);
    expect(rounds(await api().get(`${URL}?search=globex`).set(bearer(token)))).toBe(2);
    expect(rounds(await api().get(`${URL}?search=analyst`).set(bearer(token)))).toBe(2);
    expect(rounds(await api().get(`${URL}?search=dana`).set(bearer(token)))).toBe(1);
    expect(rounds(await api().get(`${URL}?search=zzz`).set(bearer(token)))).toBe(0);
  });

  it('paginates without repeating items', async () => {
    const { token } = await registerUser();
    await seed(token);
    const p1 = await api().get(`${URL}?limit=3&page=1`).set(bearer(token));
    const p2 = await api().get(`${URL}?limit=3&page=2`).set(bearer(token));
    expect(p1.body.meta).toMatchObject({ total: 4, totalPages: 2 });
    const ids = [...p1.body.data, ...p2.body.data].map((i: { id: string }) => i.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it('rejects invalid query values with 400', async () => {
    const { token } = await registerUser();
    for (const q of ['limit=1000', 'page=0', 'status=NOPE', 'when=sometime', 'applicationId=abc', 'sortBy=feedback']) {
      expect((await api().get(`${URL}?${q}`).set(bearer(token))).status, q).toBe(400);
    }
  });
});

describe('details and update', () => {
  it('returns details including feedback and notes', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await createInterview(token, app.id, { feedback: 'Went well', notes: 'Bring laptop' });
    const res = await api().get(`${URL}/${iv.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ feedback: 'Went well', notes: 'Bring laptop' });
  });

  it('records the outcome: status, result and feedback', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await createInterview(token, app.id);
    const res = await api()
      .patch(`${URL}/${iv.id}`)
      .set(bearer(token))
      .send({ status: 'COMPLETED', result: 'PASSED', feedback: 'Strong on system design' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'COMPLETED',
      result: 'PASSED',
      feedback: 'Strong on system design',
    });
  });

  it('reschedules, clears fields with empty strings, and rejects empty updates', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await createInterview(token, app.id, { location: 'HQ', round: 1 });
    const newTime = inDays(7);
    const res = await api()
      .patch(`${URL}/${iv.id}`)
      .set(bearer(token))
      .send({ scheduledAt: newTime, location: '', round: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ location: null, round: 2 });
    expect(new Date(res.body.data.scheduledAt).toISOString()).toBe(newTime);
    expect((await api().patch(`${URL}/${iv.id}`).set(bearer(token)).send({})).status).toBe(400);
  });

  it('cannot move an interview to a different application', async () => {
    const { token } = await registerUser();
    const a1 = await createApplication(token);
    const a2 = await createApplication(token, { jobTitle: 'Other' });
    const iv = await createInterview(token, a1.id);
    // applicationId is not part of the update schema, so it is ignored (and an otherwise-empty update is rejected).
    const res = await api().patch(`${URL}/${iv.id}`).set(bearer(token)).send({ applicationId: a2.id });
    expect(res.status).toBe(400);
    const row = await prisma.interview.findUniqueOrThrow({ where: { id: iv.id } });
    expect(row.applicationId).toBe(a1.id);
  });
});

describe('delete and cascade', () => {
  it('deletes an interview', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await createInterview(token, app.id);
    expect((await api().delete(`${URL}/${iv.id}`).set(bearer(token))).status).toBe(200);
    expect((await api().get(`${URL}/${iv.id}`).set(bearer(token))).status).toBe(404);
  });

  it('deleting an application deletes its interviews', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const iv = await createInterview(token, app.id);
    await api().delete(`/api/v1/applications/${app.id}`).set(bearer(token));
    expect(await prisma.interview.count({ where: { id: iv.id } })).toBe(0);
  });

  it('returns 404 for unknown or malformed ids', async () => {
    const { token } = await registerUser();
    expect((await api().delete(`${URL}/11111111-1111-4111-8111-111111111111`).set(bearer(token))).status).toBe(404);
    expect((await api().get(`${URL}/not-a-uuid`).set(bearer(token))).status).toBe(404);
  });
});

describe("another user's interviews", () => {
  it('are invisible and untouchable (404), and left unchanged', async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const app = await createApplication(a.token);
    const iv = await createInterview(a.token, app.id, { notes: 'Original' });

    expect((await api().get(URL).set(bearer(b.token))).body.meta.total).toBe(0);
    expect((await api().get(`${URL}/${iv.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await api().patch(`${URL}/${iv.id}`).set(bearer(b.token)).send({ notes: 'Hacked' })).status).toBe(404);
    expect((await api().delete(`${URL}/${iv.id}`).set(bearer(b.token))).status).toBe(404);

    const row = await prisma.interview.findUniqueOrThrow({ where: { id: iv.id } });
    expect(row.notes).toBe('Original');
  });
});

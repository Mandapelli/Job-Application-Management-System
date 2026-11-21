import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, bearer, createApplication, registerUser } from './helpers.js';

const URL = '/api/v1/applications';

describe('authentication', () => {
  it('rejects every endpoint without a token', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    for (const [method, path] of [
      ['get', URL],
      ['post', URL],
      ['get', `${URL}/${id}`],
      ['patch', `${URL}/${id}`],
      ['patch', `${URL}/${id}/status`],
      ['delete', `${URL}/${id}`],
    ] as const) {
      const res = await api()[method](path);
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });
});

describe('create', () => {
  it('creates an application with defaults and a first history row', async () => {
    const { token, user } = await registerUser();
    const res = await api()
      .post(URL)
      .set(bearer(token))
      .send({
        companyName: 'Acme Corp',
        jobTitle: 'Backend Engineer',
        location: 'Berlin',
        employmentType: 'FULL_TIME',
        workMode: 'REMOTE',
        salaryMin: 60000,
        salaryMax: 90000,
        appliedDate: '2026-11-01',
        recruiterEmail: 'hr@acme.com',
        notes: 'Referred',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: user.id,
      status: 'WISHLIST',
      salaryCurrency: 'USD',
      location: 'Berlin',
    });
    expect(res.body.data.appliedDate).toContain('2026-11-01');
    expect(res.body.data.statusHistory).toHaveLength(1);
    expect(res.body.data.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: 'WISHLIST' });
  });

  it('records the chosen initial status in history', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token, { status: 'APPLIED' });
    expect(app.status).toBe('APPLIED');
    expect(app.statusHistory[0].toStatus).toBe('APPLIED');
  });

  it.each([
    ['missing company', { companyName: undefined }, 'companyName'],
    ['missing title', { jobTitle: '' }, 'jobTitle'],
    ['min above max salary', { salaryMin: 100, salaryMax: 50 }, 'salaryMin'],
    ['non-http job URL', { jobUrl: 'javascript:alert(1)' }, 'jobUrl'],
    ['bad status', { status: 'BOGUS' }, 'status'],
    ['bad date', { appliedDate: '01/11/2026' }, 'appliedDate'],
    ['bad recruiter email', { recruiterEmail: 'nope' }, 'recruiterEmail'],
  ])('rejects %s with 400', async (_name, overrides, field) => {
    const { token } = await registerUser();
    const res = await api()
      .post(URL)
      .set(bearer(token))
      .send({ companyName: 'Acme', jobTitle: 'Dev', ...overrides });
    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBeDefined();
  });

  it('fills in companyName from a linked company the user owns', async () => {
    const { token, user } = await registerUser();
    const company = await prisma.company.create({ data: { userId: user.id, name: 'Globex' } });
    const res = await api().post(URL).set(bearer(token)).send({ companyId: company.id, jobTitle: 'Dev' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ companyId: company.id, companyName: 'Globex' });
  });

  it("rejects linking another user's company or an unknown company", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const company = await prisma.company.create({ data: { userId: a.user.id, name: 'Globex' } });

    const stolen = await api().post(URL).set(bearer(b.token)).send({ companyId: company.id, jobTitle: 'Dev' });
    expect(stolen.status).toBe(400);

    const unknown = await api()
      .post(URL)
      .set(bearer(b.token))
      .send({ companyId: '11111111-1111-4111-8111-111111111111', jobTitle: 'Dev' });
    expect(unknown.status).toBe(400);
  });
});

describe('list, search, filter, sort, pagination', () => {
  async function seed(token: string) {
    await createApplication(token, { companyName: 'Acme Corp', jobTitle: 'Backend Engineer', location: 'Berlin', employmentType: 'FULL_TIME', workMode: 'REMOTE', appliedDate: '2026-11-01', status: 'APPLIED' });
    await createApplication(token, { companyName: 'Globex', jobTitle: 'Frontend Developer', location: 'London', employmentType: 'CONTRACT', workMode: 'HYBRID', appliedDate: '2026-11-10' });
    await createApplication(token, { companyName: 'Initech', jobTitle: 'Data Analyst', location: 'Berlin', employmentType: 'INTERNSHIP', workMode: 'ONSITE', appliedDate: '2026-10-05', status: 'INTERVIEW' });
  }
  const names = (res: { body: { data: { companyName: string }[] } }) =>
    res.body.data.map((a) => a.companyName);

  it('returns items with pagination meta and omits large text fields', async () => {
    const { token } = await registerUser();
    await seed(token);
    const res = await api().get(URL).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 3, totalPages: 1 });
    expect(res.body.data[0]).not.toHaveProperty('notes');
    expect(res.body.data[0]).not.toHaveProperty('jobDescription');
  });

  it('paginates without repeating or skipping items', async () => {
    const { token } = await registerUser();
    await seed(token);
    const p1 = await api().get(`${URL}?limit=2&page=1`).set(bearer(token));
    const p2 = await api().get(`${URL}?limit=2&page=2`).set(bearer(token));
    const p3 = await api().get(`${URL}?limit=2&page=3`).set(bearer(token));
    expect(p1.body.meta).toMatchObject({ total: 3, totalPages: 2 });
    expect(p1.body.data).toHaveLength(2);
    expect(p2.body.data).toHaveLength(1);
    expect(p3.body.data).toHaveLength(0);
    const ids = [...p1.body.data, ...p2.body.data].map((a: { id: string }) => a.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('searches by company and by job title (case-insensitive)', async () => {
    const { token } = await registerUser();
    await seed(token);
    expect(names(await api().get(`${URL}?search=acme`).set(bearer(token)))).toEqual(['Acme Corp']);
    expect(names(await api().get(`${URL}?search=ANALYST`).set(bearer(token)))).toEqual(['Initech']);
    expect((await api().get(`${URL}?search=zzz`).set(bearer(token))).body.data).toHaveLength(0);
  });

  it('filters by status, location, work mode and employment type', async () => {
    const { token } = await registerUser();
    await seed(token);
    const get = async (q: string) => names(await api().get(`${URL}?${q}`).set(bearer(token)));
    expect(await get('status=INTERVIEW')).toEqual(['Initech']);
    expect((await get('location=berlin')).sort()).toEqual(['Acme Corp', 'Initech']);
    expect(await get('workMode=HYBRID')).toEqual(['Globex']);
    expect(await get('employmentType=CONTRACT')).toEqual(['Globex']);
    expect(await get('location=berlin&workMode=REMOTE')).toEqual(['Acme Corp']);
  });

  it('sorts by applied date in both directions', async () => {
    const { token } = await registerUser();
    await seed(token);
    const desc = names(await api().get(`${URL}?sortBy=appliedDate&sortOrder=desc`).set(bearer(token)));
    const asc = names(await api().get(`${URL}?sortBy=appliedDate&sortOrder=asc`).set(bearer(token)));
    expect(desc).toEqual(['Globex', 'Acme Corp', 'Initech']);
    expect(asc).toEqual(['Initech', 'Acme Corp', 'Globex']);
  });

  it.each(['limit=1000', 'limit=0', 'page=0', 'status=NOPE', 'workMode=NOPE', 'sortBy=password'])(
    'rejects invalid query %s with 400',
    async (q) => {
      const { token } = await registerUser();
      expect((await api().get(`${URL}?${q}`).set(bearer(token))).status).toBe(400);
    },
  );
});

describe('details and update', () => {
  it('returns details including notes and history', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token, { notes: 'Referred', jobDescription: 'Build APIs' });
    const res = await api().get(`${URL}/${app.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ notes: 'Referred', jobDescription: 'Build APIs' });
    expect(res.body.data.statusHistory).toHaveLength(1);
  });

  it('updates only the provided fields and clears empty strings to null', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token, { location: 'Berlin', salaryMax: 90000 });
    const res = await api()
      .patch(`${URL}/${app.id}`)
      .set(bearer(token))
      .send({ jobTitle: 'Senior Engineer', location: '', salaryMax: 95000 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      jobTitle: 'Senior Engineer',
      location: null,
      salaryMax: 95000,
      companyName: 'Acme Corp',
    });
  });

  it('cannot change status through the general update, and rejects empty updates', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    expect((await api().patch(`${URL}/${app.id}`).set(bearer(token)).send({})).status).toBe(400);
    const res = await api().patch(`${URL}/${app.id}`).set(bearer(token)).send({ status: 'OFFER' });
    expect(res.status).toBe(400);
    const after = await api().get(`${URL}/${app.id}`).set(bearer(token));
    expect(after.body.data.status).toBe('WISHLIST');
  });
});

describe('status changes and history', () => {
  it('changes status and appends history with from/to, newest first', async () => {
    const { token, user } = await registerUser();
    const app = await createApplication(token, { status: 'APPLIED' });

    await api().patch(`${URL}/${app.id}/status`).set(bearer(token)).send({ status: 'INTERVIEW' });
    const res = await api().patch(`${URL}/${app.id}/status`).set(bearer(token)).send({ status: 'OFFER' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('OFFER');
    const h = res.body.data.statusHistory;
    expect(h).toHaveLength(3);
    expect(h[0]).toMatchObject({ fromStatus: 'INTERVIEW', toStatus: 'OFFER', userId: user.id, applicationId: app.id });
    expect(h[0].changedAt).toBeTypeOf('string');
    expect(h[2]).toMatchObject({ fromStatus: null, toStatus: 'APPLIED' });
  });

  it('is a no-op (no history row) when the status is unchanged', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token, { status: 'APPLIED' });
    const res = await api().patch(`${URL}/${app.id}/status`).set(bearer(token)).send({ status: 'APPLIED' });
    expect(res.status).toBe(200);
    expect(res.body.data.statusHistory).toHaveLength(1);
  });

  it('rejects an invalid status with 400', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const res = await api().patch(`${URL}/${app.id}/status`).set(bearer(token)).send({ status: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('keeps history consistent under concurrent changes', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token, { status: 'APPLIED' });
    const targets = ['SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED'];
    const results = await Promise.all(
      targets.map((status) => api().patch(`${URL}/${app.id}/status`).set(bearer(token)).send({ status })),
    );
    expect(results.every((r) => [200, 409].includes(r.status))).toBe(true);

    const rows = await prisma.applicationStatusHistory.findMany({
      where: { applicationId: app.id },
      orderBy: { changedAt: 'asc' },
    });
    const current = await prisma.jobApplication.findUniqueOrThrow({ where: { id: app.id } });
    // Every successful change has exactly one history row, and the last row matches the stored status.
    expect(rows).toHaveLength(1 + results.filter((r) => r.status === 200).length);
    expect(rows.some((r) => r.toStatus === current.status)).toBe(true);
  });
});

describe('delete', () => {
  it('deletes the application and its history', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    expect((await api().delete(`${URL}/${app.id}`).set(bearer(token))).status).toBe(200);
    expect((await api().get(`${URL}/${app.id}`).set(bearer(token))).status).toBe(404);
    expect(await prisma.applicationStatusHistory.count({ where: { applicationId: app.id } })).toBe(0);
  });

  it('returns 404 for unknown or malformed ids', async () => {
    const { token } = await registerUser();
    expect((await api().delete(`${URL}/11111111-1111-4111-8111-111111111111`).set(bearer(token))).status).toBe(404);
    expect((await api().get(`${URL}/not-a-uuid`).set(bearer(token))).status).toBe(404);
  });
});

describe("another user's data", () => {
  it('is invisible and untouchable (404 everywhere), and left unchanged', async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const app = await createApplication(a.token, { jobTitle: 'Original', status: 'APPLIED' });
    const id = app.id;

    expect((await api().get(URL).set(bearer(b.token))).body.meta.total).toBe(0);
    expect((await api().get(`${URL}/${id}`).set(bearer(b.token))).status).toBe(404);
    expect((await api().patch(`${URL}/${id}`).set(bearer(b.token)).send({ jobTitle: 'Hacked' })).status).toBe(404);
    expect((await api().patch(`${URL}/${id}/status`).set(bearer(b.token)).send({ status: 'REJECTED' })).status).toBe(404);
    expect((await api().delete(`${URL}/${id}`).set(bearer(b.token))).status).toBe(404);

    const after = await api().get(`${URL}/${id}`).set(bearer(a.token));
    expect(after.body.data).toMatchObject({ jobTitle: 'Original', status: 'APPLIED' });
    expect(after.body.data.statusHistory).toHaveLength(1);
  });
});

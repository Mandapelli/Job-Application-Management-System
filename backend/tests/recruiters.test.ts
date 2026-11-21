import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, bearer, createApplication, registerUser } from './helpers.js';

const URL = '/api/v1/recruiters';

async function createRecruiter(token: string, body: Record<string, unknown> = {}) {
  const res = await api()
    .post(URL)
    .set(bearer(token))
    .send({ name: 'Sam Lee', ...body });
  return res.body.data as { id: string; name: string; [k: string]: any };
}
async function createCompany(token: string, name = 'Acme Corp') {
  const res = await api().post('/api/v1/companies').set(bearer(token)).send({ name });
  return res.body.data as { id: string; name: string };
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
  it('creates a recruiter linked to a company, normalizing empty strings', async () => {
    const { token, user } = await registerUser();
    const company = await createCompany(token);
    const res = await api()
      .post(URL)
      .set(bearer(token))
      .send({
        name: ' Sam Lee ',
        companyId: company.id,
        title: 'Talent Partner',
        email: 'sam@acme.com',
        phone: '',
        linkedinUrl: 'https://linkedin.com/in/sam',
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: user.id,
      name: 'Sam Lee',
      title: 'Talent Partner',
      email: 'sam@acme.com',
      phone: null,
      company: { id: company.id, name: 'Acme Corp' },
    });
  });

  it('works without a company', async () => {
    const { token } = await registerUser();
    const res = await api().post(URL).set(bearer(token)).send({ name: 'Freelance Recruiter' });
    expect(res.status).toBe(201);
    expect(res.body.data.company).toBeNull();
  });

  it.each([
    ['missing name', { name: '' }, 'name'],
    ['bad email', { email: 'nope' }, 'email'],
    ['non-http LinkedIn URL', { linkedinUrl: 'javascript:alert(1)' }, 'linkedinUrl'],
    ['malformed companyId', { companyId: 'abc' }, 'companyId'],
  ])('rejects %s with 400', async (_n, overrides, field) => {
    const { token } = await registerUser();
    const res = await api().post(URL).set(bearer(token)).send({ name: 'Sam', ...overrides });
    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBeDefined();
  });

  it("rejects another user's or an unknown company with 400", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const company = await createCompany(a.token);
    const stolen = await api().post(URL).set(bearer(b.token)).send({ name: 'Sam', companyId: company.id });
    expect(stolen.status).toBe(400);
    const unknown = await api()
      .post(URL)
      .set(bearer(b.token))
      .send({ name: 'Sam', companyId: '11111111-1111-4111-8111-111111111111' });
    expect(unknown.status).toBe(400);
  });
});

describe('list, search, filter, sort, pagination', () => {
  async function seed(token: string) {
    const acme = await createCompany(token, 'Acme Corp');
    const globex = await createCompany(token, 'Globex');
    await createRecruiter(token, { name: 'Alice Brown', companyId: acme.id, email: 'alice@acme.com', title: 'Recruiter' });
    await createRecruiter(token, { name: 'Bob Stone', companyId: globex.id, title: 'Sourcer' });
    await createRecruiter(token, { name: 'Carol King' });
    return { acme, globex };
  }
  const names = (res: { body: { data: { name: string }[] } }) => res.body.data.map((r) => r.name);

  it('lists with meta sorted by name, without notes', async () => {
    const { token } = await registerUser();
    await seed(token);
    const res = await api().get(URL).set(bearer(token));
    expect(names(res)).toEqual(['Alice Brown', 'Bob Stone', 'Carol King']);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 3, totalPages: 1 });
    expect(res.body.data[0]).not.toHaveProperty('notes');
  });

  it('searches name, email, title and company name', async () => {
    const { token } = await registerUser();
    await seed(token);
    const get = async (q: string) => names(await api().get(`${URL}?search=${q}`).set(bearer(token)));
    expect(await get('bob')).toEqual(['Bob Stone']);
    expect(await get('alice@acme')).toEqual(['Alice Brown']);
    expect(await get('sourcer')).toEqual(['Bob Stone']);
    expect(await get('globex')).toEqual(['Bob Stone']);
    expect(await get('zzz')).toEqual([]);
  });

  it('filters by company, sorts and paginates', async () => {
    const { token } = await registerUser();
    const { acme } = await seed(token);
    expect(names(await api().get(`${URL}?companyId=${acme.id}`).set(bearer(token)))).toEqual(['Alice Brown']);
    expect(names(await api().get(`${URL}?sortOrder=desc`).set(bearer(token)))).toEqual(['Carol King', 'Bob Stone', 'Alice Brown']);
    const p2 = await api().get(`${URL}?limit=2&page=2`).set(bearer(token));
    expect(names(p2)).toEqual(['Carol King']);
    expect(p2.body.meta).toMatchObject({ total: 3, totalPages: 2 });
  });

  it('rejects invalid query values with 400', async () => {
    const { token } = await registerUser();
    for (const q of ['limit=1000', 'page=0', 'companyId=abc', 'sortBy=notes']) {
      expect((await api().get(`${URL}?${q}`).set(bearer(token))).status, q).toBe(400);
    }
  });
});

describe('details and update', () => {
  it('returns details with notes, company and linked applications', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token);
    const rec = await createRecruiter(token, { companyId: company.id, notes: 'Responsive' });
    const app = await createApplication(token, { recruiterId: rec.id, jobTitle: 'Dev' });
    const res = await api().get(`${URL}/${rec.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ notes: 'Responsive', company: { name: 'Acme Corp' } });
    expect(res.body.data.applications.map((a: { id: string }) => a.id)).toEqual([app.id]);
  });

  it('updates fields, can unlink the company, and rejects empty updates', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token);
    const rec = await createRecruiter(token, { companyId: company.id, title: 'Recruiter' });
    const res = await api().patch(`${URL}/${rec.id}`).set(bearer(token)).send({ companyId: null, title: '' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ company: null, title: null, name: 'Sam Lee' });
    expect((await api().patch(`${URL}/${rec.id}`).set(bearer(token)).send({})).status).toBe(400);
  });

  it('changing contact details updates the linked applications too', async () => {
    const { token } = await registerUser();
    const rec = await createRecruiter(token, { email: 'old@acme.com', phone: '111' });
    const app = await createApplication(token, { recruiterId: rec.id });
    await api().patch(`${URL}/${rec.id}`).set(bearer(token)).send({ name: 'Samantha Lee', email: 'new@acme.com', phone: '' });
    const after = await api().get(`/api/v1/applications/${app.id}`).set(bearer(token));
    expect(after.body.data).toMatchObject({
      recruiterName: 'Samantha Lee',
      recruiterEmail: 'new@acme.com',
      recruiterPhone: null,
    });
  });
});

describe('linking recruiters to applications', () => {
  it('copies the recruiter details onto a new application', async () => {
    const { token } = await registerUser();
    const rec = await createRecruiter(token, { email: 'sam@acme.com', phone: '555' });
    const app = await createApplication(token, {
      recruiterId: rec.id,
      recruiterName: 'ignored typed name',
    });
    expect(app).toMatchObject({
      recruiterId: rec.id,
      recruiterName: 'Sam Lee',
      recruiterEmail: 'sam@acme.com',
      recruiterPhone: '555',
    });
  });

  it('links an existing application on update, and unlinking keeps the copied details', async () => {
    const { token } = await registerUser();
    const rec = await createRecruiter(token, { email: 'sam@acme.com' });
    const app = await createApplication(token);

    const linked = await api().patch(`/api/v1/applications/${app.id}`).set(bearer(token)).send({ recruiterId: rec.id });
    expect(linked.body.data).toMatchObject({ recruiterId: rec.id, recruiterName: 'Sam Lee' });

    const unlinked = await api().patch(`/api/v1/applications/${app.id}`).set(bearer(token)).send({ recruiterId: null });
    expect(unlinked.body.data).toMatchObject({ recruiterId: null, recruiterName: 'Sam Lee', recruiterEmail: 'sam@acme.com' });
  });

  it("rejects another user's or an unknown recruiter with 400", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const rec = await createRecruiter(a.token);
    for (const recruiterId of [rec.id, '11111111-1111-4111-8111-111111111111']) {
      const res = await api()
        .post('/api/v1/applications')
        .set(bearer(b.token))
        .send({ companyName: 'X', jobTitle: 'Y', recruiterId });
      expect(res.status).toBe(400);
    }
  });
});

describe('delete', () => {
  it('deletes the recruiter but keeps applications (unlinked, contact details preserved)', async () => {
    const { token } = await registerUser();
    const rec = await createRecruiter(token, { email: 'sam@acme.com' });
    const app = await createApplication(token, { recruiterId: rec.id });

    expect((await api().delete(`${URL}/${rec.id}`).set(bearer(token))).status).toBe(200);
    expect((await api().get(`${URL}/${rec.id}`).set(bearer(token))).status).toBe(404);

    const kept = await api().get(`/api/v1/applications/${app.id}`).set(bearer(token));
    expect(kept.body.data).toMatchObject({ recruiterId: null, recruiterName: 'Sam Lee', recruiterEmail: 'sam@acme.com' });
  });

  it('deleting a company keeps its recruiters (unlinked from the company)', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token);
    const rec = await createRecruiter(token, { companyId: company.id });
    await api().delete(`/api/v1/companies/${company.id}`).set(bearer(token));
    const res = await api().get(`${URL}/${rec.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.company).toBeNull();
  });

  it('company details list its recruiters', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token);
    const rec = await createRecruiter(token, { companyId: company.id });
    const res = await api().get(`/api/v1/companies/${company.id}`).set(bearer(token));
    expect(res.body.data.recruiters.map((r: { id: string }) => r.id)).toEqual([rec.id]);
    expect(res.body.data._count.recruiters).toBe(1);
  });

  it('returns 404 for unknown or malformed ids', async () => {
    const { token } = await registerUser();
    expect((await api().delete(`${URL}/11111111-1111-4111-8111-111111111111`).set(bearer(token))).status).toBe(404);
    expect((await api().get(`${URL}/not-a-uuid`).set(bearer(token))).status).toBe(404);
  });
});

describe("another user's recruiters", () => {
  it('are invisible and untouchable (404), and left unchanged', async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const rec = await createRecruiter(a.token, { name: 'Original' });

    expect((await api().get(URL).set(bearer(b.token))).body.meta.total).toBe(0);
    expect((await api().get(`${URL}/${rec.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await api().patch(`${URL}/${rec.id}`).set(bearer(b.token)).send({ name: 'Hacked' })).status).toBe(404);
    expect((await api().delete(`${URL}/${rec.id}`).set(bearer(b.token))).status).toBe(404);

    const row = await prisma.recruiter.findUniqueOrThrow({ where: { id: rec.id } });
    expect(row.name).toBe('Original');
  });
});

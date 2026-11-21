import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, bearer, createApplication, registerUser } from './helpers.js';

const URL = '/api/v1/companies';

async function createCompany(token: string, body: Record<string, unknown> = {}) {
  const res = await api()
    .post(URL)
    .set(bearer(token))
    .send({ name: 'Acme Corp', ...body });
  return res.body.data as { id: string; name: string; [k: string]: any };
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
  it('creates a company and normalizes empty strings to null', async () => {
    const { token, user } = await registerUser();
    const res = await api()
      .post(URL)
      .set(bearer(token))
      .send({ name: '  Acme Corp  ', website: 'https://acme.com', industry: 'Software', location: '', notes: '' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: user.id,
      name: 'Acme Corp',
      website: 'https://acme.com',
      industry: 'Software',
      location: null,
      notes: null,
    });
    expect(res.body.data._count.applications).toBe(0);
  });

  it.each([
    ['missing name', { name: '' }, 'name'],
    ['non-http website', { website: 'javascript:alert(1)' }, 'website'],
    ['name too long', { name: 'x'.repeat(151) }, 'name'],
  ])('rejects %s with 400', async (_n, overrides, field) => {
    const { token } = await registerUser();
    const res = await api().post(URL).set(bearer(token)).send({ name: 'Acme', ...overrides });
    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBeDefined();
  });

  it('rejects a duplicate name (case-insensitive) with 409, but allows it for another user', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await createCompany(a.token, { name: 'Acme Corp' });

    const dup = await api().post(URL).set(bearer(a.token)).send({ name: 'ACME corp' });
    expect(dup.status).toBe(409);

    const other = await api().post(URL).set(bearer(b.token)).send({ name: 'Acme Corp' });
    expect(other.status).toBe(201);
  });
});

describe('list, search, sort, pagination', () => {
  async function seed(token: string) {
    await createCompany(token, { name: 'Acme Corp', industry: 'Software', location: 'Berlin' });
    await createCompany(token, { name: 'Globex', industry: 'Manufacturing', location: 'London' });
    await createCompany(token, { name: 'Initech', industry: 'Software', location: 'Austin' });
  }
  const names = (res: { body: { data: { name: string }[] } }) => res.body.data.map((c) => c.name);

  it('lists with meta, sorted by name by default, without notes', async () => {
    const { token } = await registerUser();
    await seed(token);
    const res = await api().get(URL).set(bearer(token));
    expect(names(res)).toEqual(['Acme Corp', 'Globex', 'Initech']);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 3, totalPages: 1 });
    expect(res.body.data[0]).not.toHaveProperty('notes');
  });

  it('searches name, industry and location', async () => {
    const { token } = await registerUser();
    await seed(token);
    expect(names(await api().get(`${URL}?search=glob`).set(bearer(token)))).toEqual(['Globex']);
    expect(names(await api().get(`${URL}?search=software`).set(bearer(token)))).toEqual(['Acme Corp', 'Initech']);
    expect(names(await api().get(`${URL}?search=london`).set(bearer(token)))).toEqual(['Globex']);
    expect((await api().get(`${URL}?search=zzz`).set(bearer(token))).body.data).toHaveLength(0);
  });

  it('sorts and paginates', async () => {
    const { token } = await registerUser();
    await seed(token);
    expect(names(await api().get(`${URL}?sortOrder=desc`).set(bearer(token)))).toEqual(['Initech', 'Globex', 'Acme Corp']);
    const p2 = await api().get(`${URL}?limit=2&page=2`).set(bearer(token));
    expect(names(p2)).toEqual(['Initech']);
    expect(p2.body.meta).toMatchObject({ total: 3, totalPages: 2 });
  });

  it('rejects invalid query values with 400', async () => {
    const { token } = await registerUser();
    for (const q of ['limit=1000', 'page=0', 'sortBy=notes']) {
      expect((await api().get(`${URL}?${q}`).set(bearer(token))).status, q).toBe(400);
    }
  });

  it('shows how many applications each company has', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token);
    await createApplication(token, { companyId: company.id });
    await createApplication(token, { companyId: company.id, jobTitle: 'Other' });
    const res = await api().get(URL).set(bearer(token));
    expect(res.body.data[0]._count.applications).toBe(2);
  });
});

describe('details and update', () => {
  it('returns details with notes and linked applications', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token, { notes: 'Great culture' });
    const app = await createApplication(token, { companyId: company.id, jobTitle: 'Dev' });
    const res = await api().get(`${URL}/${company.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe('Great culture');
    expect(res.body.data.applications.map((a: { id: string }) => a.id)).toEqual([app.id]);
  });

  it('updates only the provided fields', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token, { industry: 'Software', location: 'Berlin' });
    const res = await api().patch(`${URL}/${company.id}`).set(bearer(token)).send({ location: '', industry: 'Fintech' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Acme Corp', industry: 'Fintech', location: null });
    expect((await api().patch(`${URL}/${company.id}`).set(bearer(token)).send({})).status).toBe(400);
  });

  it('renaming also renames the company on its applications', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token);
    const app = await createApplication(token, { companyId: company.id });
    await api().patch(`${URL}/${company.id}`).set(bearer(token)).send({ name: 'Acme Inc' });
    const after = await api().get(`/api/v1/applications/${app.id}`).set(bearer(token));
    expect(after.body.data.companyName).toBe('Acme Inc');
  });

  it('rejects renaming to another existing company, but allows keeping its own name', async () => {
    const { token } = await registerUser();
    await createCompany(token, { name: 'Globex' });
    const acme = await createCompany(token, { name: 'Acme Corp' });
    expect((await api().patch(`${URL}/${acme.id}`).set(bearer(token)).send({ name: 'globex' })).status).toBe(409);
    expect((await api().patch(`${URL}/${acme.id}`).set(bearer(token)).send({ name: 'Acme Corp' })).status).toBe(200);
  });
});

describe('delete', () => {
  it('deletes the company but keeps its applications (unlinked, name preserved)', async () => {
    const { token } = await registerUser();
    const company = await createCompany(token);
    const app = await createApplication(token, { companyId: company.id });

    expect((await api().delete(`${URL}/${company.id}`).set(bearer(token))).status).toBe(200);
    expect((await api().get(`${URL}/${company.id}`).set(bearer(token))).status).toBe(404);

    const kept = await api().get(`/api/v1/applications/${app.id}`).set(bearer(token));
    expect(kept.status).toBe(200);
    expect(kept.body.data).toMatchObject({ companyId: null, companyName: 'Acme Corp' });
  });

  it('returns 404 for unknown or malformed ids', async () => {
    const { token } = await registerUser();
    expect((await api().delete(`${URL}/11111111-1111-4111-8111-111111111111`).set(bearer(token))).status).toBe(404);
    expect((await api().get(`${URL}/not-a-uuid`).set(bearer(token))).status).toBe(404);
  });
});

describe("another user's companies", () => {
  it('are invisible and untouchable (404), and left unchanged', async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const company = await createCompany(a.token, { name: 'Original' });

    expect((await api().get(URL).set(bearer(b.token))).body.meta.total).toBe(0);
    expect((await api().get(`${URL}/${company.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await api().patch(`${URL}/${company.id}`).set(bearer(b.token)).send({ name: 'Hacked' })).status).toBe(404);
    expect((await api().delete(`${URL}/${company.id}`).set(bearer(b.token))).status).toBe(404);

    const row = await prisma.company.findUniqueOrThrow({ where: { id: company.id } });
    expect(row.name).toBe('Original');
  });
});

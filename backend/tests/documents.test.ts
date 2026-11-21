import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { attachmentHeader } from '../src/lib/fileType.js';
import { prisma } from '../src/lib/prisma.js';
import { MAX_DOCUMENTS_PER_USER } from '../src/services/document.service.js';
import { api, bearer, createApplication, registerUser } from './helpers.js';

const URL = '/api/v1/documents';
const UPLOAD_ROOT = path.resolve('uploads-test');

// --- sample files (just enough real bytes to look like each format) ---------------------------
const pdf = (extra = '') => Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${extra}\n%%EOF`);
const docx = () =>
  Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
    Buffer.from('[Content_Types].xml word/document.xml word/styles.xml'),
  ]);
const doc = () => Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(64)]);
const xlsx = () =>
  Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('[Content_Types].xml xl/workbook.xml')]);
const exe = () => Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64, 1)]);

async function upload(
  token: string,
  file: Buffer | null,
  filename = 'resume.pdf',
  fields: Record<string, string> = {},
  fieldName = 'file',
  contentType?: string,
) {
  let req = api().post(URL).set(bearer(token));
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  if (file) req = req.attach(fieldName, file, { filename, ...(contentType && { contentType }) });
  return req;
}

async function uploadOk(token: string, filename = 'resume.pdf', fields: Record<string, string> = {}, file = pdf()) {
  const res = await upload(token, file, filename, fields);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data as { id: string; [k: string]: any };
}

const storedPath = async (id: string) => {
  const row = await prisma.document.findUniqueOrThrow({ where: { id } });
  return path.resolve(UPLOAD_ROOT, row.storageKey);
};

describe('authentication', () => {
  it('rejects every endpoint without a token', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    for (const [method, p] of [
      ['get', URL],
      ['post', URL],
      ['get', `${URL}/${id}`],
      ['patch', `${URL}/${id}`],
      ['delete', `${URL}/${id}`],
      ['get', `${URL}/${id}/download`],
      ['post', `${URL}/${id}/applications`],
      ['delete', `${URL}/${id}/applications/${id}`],
    ] as const) {
      expect((await api()[method](p)).status, `${method} ${p}`).toBe(401);
    }
  });

  it('does not accept an upload from an anonymous user', async () => {
    const res = await api().post(URL).attach('file', pdf(), { filename: 'resume.pdf' });
    expect(res.status).toBe(401);
  });
});

describe('uploading', () => {
  it('stores a PDF and returns its metadata (never the storage key)', async () => {
    const { token, user } = await registerUser();
    const file = pdf('hello');
    const res = await upload(token, file, 'My Resume.pdf');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'My Resume.pdf',
      fileName: 'My Resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: file.length,
      type: 'RESUME',
      description: null,
    });
    expect(res.body.data).not.toHaveProperty('storageKey');
    expect(JSON.stringify(res.body)).not.toContain(UPLOAD_ROOT);

    const row = await prisma.document.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(row.userId).toBe(user.id);
    expect(existsSync(path.resolve(UPLOAD_ROOT, row.storageKey))).toBe(true);
  });

  it('accepts DOCX and DOC, with the mime type taken from the content', async () => {
    const { token } = await registerUser();
    expect(await uploadOk(token, 'cv.docx', {}, docx())).toMatchObject({
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(await uploadOk(token, 'old.doc', {}, doc())).toMatchObject({ mimeType: 'application/msword' });
  });

  it('uses the optional name, type and description fields', async () => {
    const { token } = await registerUser();
    const res = await uploadOk(token, 'file.pdf', { name: 'Backend CV', type: 'COVER_LETTER', description: 'For Acme' });
    expect(res).toMatchObject({ name: 'Backend CV', fileName: 'file.pdf', type: 'COVER_LETTER', description: 'For Acme' });
  });

  it('stores each upload under a different random name, even for the same file name', async () => {
    const { token } = await registerUser();
    const a = await uploadOk(token);
    const b = await uploadOk(token);
    const [pa, pb] = [await storedPath(a.id), await storedPath(b.id)];
    expect(pa).not.toBe(pb);
    expect(path.basename(pa)).not.toContain('resume');
  });

  it.each([
    ['plain text renamed to .pdf', () => Buffer.from('just some text'), 'resume.pdf'],
    ['an executable renamed to .pdf', exe, 'resume.pdf'],
    ['a real PDF with a wrong extension (.exe)', () => pdf(), 'resume.exe'],
    ['a real PDF named .docx', () => pdf(), 'resume.docx'],
    ['a spreadsheet (zip) named .docx', xlsx, 'resume.docx'],
    ['a Word file named .pdf', docx, 'resume.pdf'],
    ['a file with no extension', () => pdf(), 'resume'],
    ['an empty file', () => Buffer.alloc(0), 'empty.pdf'],
    ['a script', () => Buffer.from('<script>alert(1)</script>'), 'x.html'],
  ])('rejects %s with 400', async (_name, make, filename) => {
    const { token } = await registerUser();
    const res = await upload(token, make(), filename);
    expect(res.status).toBe(400);
    expect(await prisma.document.count()).toBe(0);
  });

  it('ignores the Content-Type the browser claims', async () => {
    const { token } = await registerUser();
    const res = await upload(token, exe(), 'resume.pdf', {}, 'file', 'application/pdf');
    expect(res.status).toBe(400);
  });

  it('rejects a request with no file, or a file in the wrong form field', async () => {
    const { token } = await registerUser();
    expect((await upload(token, null)).status).toBe(400);
    expect((await upload(token, pdf(), 'resume.pdf', {}, 'upload')).status).toBe(400);
  });

  it('rejects files over the size limit with 413, and stores nothing', async () => {
    const { token } = await registerUser();
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(6 * 1024 * 1024)]);
    const res = await upload(token, big, 'big.pdf');
    expect(res.status).toBe(413);
    expect(res.body.message).toContain('5 MB');
    expect(await prisma.document.count()).toBe(0);
  });

  it('rejects an invalid type with 400', async () => {
    const { token } = await registerUser();
    const res = await upload(token, pdf(), 'resume.pdf', { type: 'BANNER' });
    expect(res.status).toBe(400);
    expect(res.body.errors.type).toBeDefined();
  });

  it('cleans dangerous file names and never writes outside the upload folder', async () => {
    const { token } = await registerUser();
    const traversal = await uploadOk(token, '../../evil.pdf');
    expect(traversal.fileName).toBe('evil.pdf');
    expect(existsSync(path.resolve(UPLOAD_ROOT, '..', 'evil.pdf'))).toBe(false);
    expect(existsSync(path.resolve(UPLOAD_ROOT, '..', '..', 'evil.pdf'))).toBe(false);
    expect((await storedPath(traversal.id)).startsWith(UPLOAD_ROOT + path.sep)).toBe(true);

    expect((await uploadOk(token, 'a<b>c:d|e.pdf')).fileName).toBe('a_b_c_d_e.pdf');
    expect((await uploadOk(token, '..\\..\\win.pdf')).fileName).toBe('win.pdf');
  });

  it('keeps accented file names intact', async () => {
    const { token } = await registerUser();
    expect((await uploadOk(token, 'Résumé.pdf')).fileName).toBe('Résumé.pdf');
  });

  it(`stops at ${MAX_DOCUMENTS_PER_USER} documents per user`, async () => {
    const { token, user } = await registerUser();
    await prisma.document.createMany({
      data: Array.from({ length: MAX_DOCUMENTS_PER_USER }, (_, i) => ({
        userId: user.id,
        name: `Doc ${i}`,
        fileName: `doc${i}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1,
        storageKey: `zz/limit-${user.id}-${i}.pdf`,
      })),
    });
    const res = await upload(token, pdf(), 'one-more.pdf');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('limit');
  });
});

describe('downloading', () => {
  it('returns the exact bytes with safe headers', async () => {
    const { token } = await registerUser();
    const file = pdf('contents to compare');
    const created = (await upload(token, file, 'My Resume.pdf')).body.data;

    const res = await api()
      .get(`${URL}/${created.id}/download`)
      .set(bearer(token))
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(Buffer.compare(res.body as Buffer, file)).toBe(0);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="My Resume\.pdf"/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('sends accented names correctly (ASCII fallback plus the real UTF-8 name)', async () => {
    const { token } = await registerUser();
    const created = await uploadOk(token, 'Résumé "final".pdf'); // quotes are cleaned at upload time
    expect(created.fileName).toBe('Résumé _final_.pdf');
    const res = await api().get(`${URL}/${created.id}/download`).set(bearer(token));
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="R_sum_ _final_.pdf"; filename*=UTF-8''R%C3%A9sum%C3%A9%20_final_.pdf`,
    );
  });

  it('the header builder cannot be broken out of by quotes or line breaks', () => {
    const header = attachmentHeader('evil".pdf\r\nSet-Cookie: x=1');
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.match(/filename="([^"]*)"/)![1]).not.toContain('"');
    expect(header).toContain("filename*=UTF-8''");
    expect(header.startsWith('attachment;')).toBe(true);
  });

  it('returns 404 if the stored file has gone missing', async () => {
    const { token } = await registerUser();
    const created = await uploadOk(token);
    rmSync(await storedPath(created.id));
    const res = await api().get(`${URL}/${created.id}/download`).set(bearer(token));
    expect(res.status).toBe(404);
  });
});

describe('list, search, filter, sort, pagination', () => {
  const names = (res: { body: { data: { name: string }[] } }) => res.body.data.map((d) => d.name);

  async function seed(token: string) {
    await uploadOk(token, 'a.pdf', { name: 'Backend CV', type: 'RESUME' });
    await uploadOk(token, 'b.pdf', { name: 'Cover for Acme', type: 'COVER_LETTER', description: 'tailored letter' }, pdf('x'.repeat(500)));
    await uploadOk(token, 'c.docx', { name: 'Certificate', type: 'OTHER' }, docx());
  }

  it('lists with meta, newest first, without storage keys', async () => {
    const { token } = await registerUser();
    await seed(token);
    const res = await api().get(URL).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 3, totalPages: 1 });
    expect(names(res)).toEqual(['Certificate', 'Cover for Acme', 'Backend CV']);
    expect(JSON.stringify(res.body)).not.toContain('storageKey');
    expect(res.body.data[0]._count.applications).toBe(0);
  });

  it('filters by type, searches name/file/description, and sorts by size', async () => {
    const { token } = await registerUser();
    await seed(token);
    const get = async (q: string) => names(await api().get(`${URL}?${q}`).set(bearer(token)));
    expect(await get('type=COVER_LETTER')).toEqual(['Cover for Acme']);
    expect(await get('search=backend')).toEqual(['Backend CV']);
    expect(await get('search=c.docx')).toEqual(['Certificate']);
    expect(await get('search=tailored')).toEqual(['Cover for Acme']);
    expect(await get('search=zzz')).toEqual([]);
    expect((await get('sortBy=sizeBytes&sortOrder=desc'))[0]).toBe('Cover for Acme');
    expect(await get('sortBy=name&sortOrder=asc')).toEqual(['Backend CV', 'Certificate', 'Cover for Acme']);
  });

  it('paginates and rejects invalid query values', async () => {
    const { token } = await registerUser();
    await seed(token);
    const p2 = await api().get(`${URL}?limit=2&page=2`).set(bearer(token));
    expect(p2.body.data).toHaveLength(1);
    expect(p2.body.meta).toMatchObject({ total: 3, totalPages: 2 });
    for (const q of ['limit=1000', 'page=0', 'type=VIDEO', 'applicationId=abc', 'sortBy=storageKey']) {
      expect((await api().get(`${URL}?${q}`).set(bearer(token))).status, q).toBe(400);
    }
  });
});

describe('details and update', () => {
  it('returns details, and updates name, type and description', async () => {
    const { token } = await registerUser();
    const d = await uploadOk(token, 'cv.pdf', { description: 'old' });
    expect((await api().get(`${URL}/${d.id}`).set(bearer(token))).body.data).toMatchObject({ name: 'cv.pdf', applications: [] });

    const res = await api().patch(`${URL}/${d.id}`).set(bearer(token)).send({ name: 'Final CV', type: 'OTHER', description: '' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Final CV', type: 'OTHER', description: null, fileName: 'cv.pdf' });
  });

  it('cannot change the stored file or its metadata, and rejects empty or invalid updates', async () => {
    const { token } = await registerUser();
    const d = await uploadOk(token);
    const before = await prisma.document.findUniqueOrThrow({ where: { id: d.id } });

    expect((await api().patch(`${URL}/${d.id}`).set(bearer(token)).send({})).status).toBe(400);
    expect((await api().patch(`${URL}/${d.id}`).set(bearer(token)).send({ type: 'BANNER' })).status).toBe(400);
    // These fields are not part of the update schema, so they are ignored (the otherwise-empty update is rejected).
    const res = await api()
      .patch(`${URL}/${d.id}`)
      .set(bearer(token))
      .send({ storageKey: '../../etc/passwd', mimeType: 'text/html', sizeBytes: 1 });
    expect(res.status).toBe(400);
    const after = await prisma.document.findUniqueOrThrow({ where: { id: d.id } });
    expect(after.storageKey).toBe(before.storageKey);
    expect(after.mimeType).toBe('application/pdf');
  });
});

describe('attaching to applications', () => {
  it('attaches, is idempotent, lists on both sides, and detaches', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const d = await uploadOk(token);

    const attach = () => api().post(`${URL}/${d.id}/applications`).set(bearer(token)).send({ applicationId: app.id });
    const first = await attach();
    expect(first.status).toBe(200);
    expect(first.body.data.applications).toEqual([{ id: app.id, jobTitle: 'Backend Engineer', companyName: 'Acme Corp' }]);
    expect((await attach()).body.data.applications).toHaveLength(1); // attaching twice does not duplicate

    const byApp = await api().get(`${URL}?applicationId=${app.id}`).set(bearer(token));
    expect(byApp.body.data.map((x: { id: string }) => x.id)).toEqual([d.id]);
    expect(byApp.body.data[0]._count.applications).toBe(1);

    const detached = await api().delete(`${URL}/${d.id}/applications/${app.id}`).set(bearer(token));
    expect(detached.status).toBe(200);
    expect(detached.body.data.applications).toEqual([]);
    expect((await api().get(`${URL}?applicationId=${app.id}`).set(bearer(token))).body.data).toHaveLength(0);
  });

  it('one document can be attached to several applications', async () => {
    const { token } = await registerUser();
    const a1 = await createApplication(token);
    const a2 = await createApplication(token, { jobTitle: 'Other' });
    const d = await uploadOk(token);
    for (const app of [a1, a2]) {
      await api().post(`${URL}/${d.id}/applications`).set(bearer(token)).send({ applicationId: app.id });
    }
    expect((await api().get(`${URL}/${d.id}`).set(bearer(token))).body.data.applications).toHaveLength(2);
  });

  it("rejects another user's or an unknown application with 400", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const app = await createApplication(a.token);
    const d = await uploadOk(b.token);
    for (const applicationId of [app.id, '11111111-1111-4111-8111-111111111111']) {
      const res = await api().post(`${URL}/${d.id}/applications`).set(bearer(b.token)).send({ applicationId });
      expect(res.status).toBe(400);
    }
    expect((await api().post(`${URL}/${d.id}/applications`).set(bearer(b.token)).send({ applicationId: 'abc' })).status).toBe(400);
  });

  it('deleting an application keeps the document', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const d = await uploadOk(token);
    await api().post(`${URL}/${d.id}/applications`).set(bearer(token)).send({ applicationId: app.id });
    await api().delete(`/api/v1/applications/${app.id}`).set(bearer(token));

    const res = await api().get(`${URL}/${d.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.applications).toEqual([]);
    expect(existsSync(await storedPath(d.id))).toBe(true);
  });
});

describe('delete', () => {
  it('deletes the row, the stored file and the attachments, but not the application', async () => {
    const { token } = await registerUser();
    const app = await createApplication(token);
    const d = await uploadOk(token);
    await api().post(`${URL}/${d.id}/applications`).set(bearer(token)).send({ applicationId: app.id });
    const file = await storedPath(d.id);
    expect(existsSync(file)).toBe(true);

    expect((await api().delete(`${URL}/${d.id}`).set(bearer(token))).status).toBe(200);
    expect(existsSync(file)).toBe(false);
    expect((await api().get(`${URL}/${d.id}`).set(bearer(token))).status).toBe(404);
    expect(await prisma.applicationDocument.count()).toBe(0);
    expect((await api().get(`/api/v1/applications/${app.id}`).set(bearer(token))).status).toBe(200);
  });

  it('still succeeds if the stored file was already gone', async () => {
    const { token } = await registerUser();
    const d = await uploadOk(token);
    rmSync(await storedPath(d.id));
    expect((await api().delete(`${URL}/${d.id}`).set(bearer(token))).status).toBe(200);
  });

  it('returns 404 for unknown or malformed ids', async () => {
    const { token } = await registerUser();
    expect((await api().delete(`${URL}/11111111-1111-4111-8111-111111111111`).set(bearer(token))).status).toBe(404);
    expect((await api().get(`${URL}/not-a-uuid`).set(bearer(token))).status).toBe(404);
    expect((await api().get(`${URL}/not-a-uuid/download`).set(bearer(token))).status).toBe(404);
  });
});

describe("another user's documents", () => {
  it('are invisible and untouchable (404): no reading, downloading, editing, attaching or deleting', async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const appB = await createApplication(b.token);
    const d = await uploadOk(a.token, 'secret.pdf', { name: 'Original' });
    const file = await storedPath(d.id);

    expect((await api().get(URL).set(bearer(b.token))).body.meta.total).toBe(0);
    expect((await api().get(`${URL}/${d.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await api().get(`${URL}/${d.id}/download`).set(bearer(b.token))).status).toBe(404);
    expect((await api().patch(`${URL}/${d.id}`).set(bearer(b.token)).send({ name: 'Hacked' })).status).toBe(404);
    expect((await api().post(`${URL}/${d.id}/applications`).set(bearer(b.token)).send({ applicationId: appB.id })).status).toBe(404);
    expect((await api().delete(`${URL}/${d.id}/applications/${appB.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await api().delete(`${URL}/${d.id}`).set(bearer(b.token))).status).toBe(404);

    const row = await prisma.document.findUniqueOrThrow({ where: { id: d.id } });
    expect(row.name).toBe('Original');
    expect(existsSync(file)).toBe(true);
  });
});

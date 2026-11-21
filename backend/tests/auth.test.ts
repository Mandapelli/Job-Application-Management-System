import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, bearer, registerUser } from './helpers.js';

describe('POST /auth/register', () => {
  it('creates a user, lowercases the email and returns a token (no password data)', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Jane', email: 'JANE@Example.com', password: 'Passw0rdOK' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('jane@example.com');
    expect(res.body.data.token).toBeTypeOf('string');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Jane', email: 'jane@example.com', password: 'Passw0rdOK' });
    const row = await prisma.user.findUniqueOrThrow({ where: { email: 'jane@example.com' } });
    expect(row.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(row.passwordHash).not.toContain('Passw0rdOK');
  });

  it('rejects a duplicate email with 409', async () => {
    const body = { name: 'Jane', email: 'jane@example.com', password: 'Passw0rdOK' };
    await api().post('/api/v1/auth/register').send(body);
    const res = await api().post('/api/v1/auth/register').send(body);
    expect(res.status).toBe(409);
  });

  it('returns per-field validation errors', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'bad', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
    expect(res.body.errors.email).toBeDefined();
    expect(res.body.errors.password).toBeDefined();
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('logs in with correct credentials', async () => {
    const u = await registerUser();
    const res = await api().post('/api/v1/auth/login').send({ email: u.email, password: u.password });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTypeOf('string');
  });

  it('gives the same 401 message for a wrong password and an unknown email', async () => {
    const u = await registerUser();
    const wrong = await api().post('/api/v1/auth/login').send({ email: u.email, password: 'wrongpass1' });
    const unknown = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrongpass1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });
});

describe('GET /auth/me and logout', () => {
  it('returns the current user for a valid token', async () => {
    const u = await registerUser('Jane');
    const res = await api().get('/api/v1/auth/me').set(bearer(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(u.email);
  });

  it('rejects missing, garbage and expired tokens with 401', async () => {
    const u = await registerUser();
    const expired = jwt.sign({ sub: u.user.id }, process.env.JWT_SECRET!, { expiresIn: -10 });

    expect((await api().get('/api/v1/auth/me')).status).toBe(401);
    expect((await api().get('/api/v1/auth/me').set(bearer('garbage.token.here'))).status).toBe(401);
    const res = await api().get('/api/v1/auth/me').set(bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token expired');
  });

  it('rejects a token signed with a different secret', async () => {
    const u = await registerUser();
    const forged = jwt.sign({ sub: u.user.id }, 'some-other-secret-some-other-secret-1234');
    expect((await api().get('/api/v1/auth/me').set(bearer(forged))).status).toBe(401);
  });

  it('rejects a valid token whose user was deleted', async () => {
    const u = await registerUser();
    await prisma.user.delete({ where: { id: u.user.id } });
    expect((await api().get('/api/v1/auth/me').set(bearer(u.token))).status).toBe(401);
  });

  it('logout requires auth and succeeds with a token', async () => {
    const u = await registerUser();
    expect((await api().post('/api/v1/auth/logout')).status).toBe(401);
    expect((await api().post('/api/v1/auth/logout').set(bearer(u.token))).status).toBe(200);
  });
});

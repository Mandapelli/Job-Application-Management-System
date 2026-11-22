import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { memoryOutbox } from '../src/lib/mailer/memory.js';
import { prisma } from '../src/lib/prisma.js';
import { passwordResetRepository } from '../src/repositories/passwordReset.repository.js';
import { api, bearer, registerUser } from './helpers.js';

const AUTH = '/api/v1/auth';
const NEW_PASSWORD = 'Brand9NewPass';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// Login tokens carry whole-second timestamps, so "issued before the password change" needs the clock to tick over.
const nextSecond = () => sleep(1100);

const login = (email: string, password: string) => api().post(`${AUTH}/login`).send({ email, password });
const forgot = (email: string) => api().post(`${AUTH}/forgot-password`).send({ email });
const reset = (token: string, newPassword = NEW_PASSWORD) =>
  api().post(`${AUTH}/reset-password`).send({ token, newPassword });
const tokenFrom = (mail: { text: string }) => /reset-password\?token=([A-Za-z0-9_-]+)/.exec(mail.text)![1]!;

/** Asks for a reset link and returns the secret from the "email". */
async function requestLink(email: string) {
  memoryOutbox.length = 0;
  expect((await forgot(email)).status).toBe(200);
  expect(memoryOutbox).toHaveLength(1);
  return tokenFrom(memoryOutbox[0]!);
}

beforeEach(() => {
  memoryOutbox.length = 0;
});

describe('POST /auth/change-password', () => {
  const change = (token: string, currentPassword: string, newPassword = NEW_PASSWORD) =>
    api().post(`${AUTH}/change-password`).set(bearer(token)).send({ currentPassword, newPassword });

  it('requires login', async () => {
    const res = await api().post(`${AUTH}/change-password`).send({ currentPassword: 'x', newPassword: NEW_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('changes the password: the old one stops working, the new one works, and this session continues', async () => {
    const u = await registerUser();
    const res = await change(u.token, u.password);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTypeOf('string');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    expect((await login(u.email, u.password)).status).toBe(401);
    expect((await login(u.email, NEW_PASSWORD)).status).toBe(200);
    expect((await api().get(`${AUTH}/me`).set(bearer(res.body.data.token))).status).toBe(200);
  });

  it('rejects a wrong current password with a field error (and is NOT treated as a logout)', async () => {
    const u = await registerUser();
    const res = await change(u.token, 'definitely-wrong1');
    expect(res.status).toBe(400); // 400, not 401: a 401 would make the app log the user out
    expect(res.body.errors.currentPassword).toBeDefined();
    expect((await login(u.email, u.password)).status).toBe(200); // password unchanged
  });

  it('rejects a new password equal to the current one', async () => {
    const u = await registerUser();
    const res = await change(u.token, u.password, u.password);
    expect(res.status).toBe(400);
    expect(res.body.errors.newPassword).toBeDefined();
  });

  it.each([
    ['too short', 'Ab1'],
    ['no number', 'OnlyLettersHere'],
    ['no letter', '1234567890'],
    ['too long', 'A1' + 'x'.repeat(80)],
  ])('rejects a weak new password (%s)', async (_n, newPassword) => {
    const u = await registerUser();
    const res = await change(u.token, u.password, newPassword);
    expect(res.status).toBe(400);
    expect(res.body.errors.newPassword).toBeDefined();
  });

  it('requires the current password to be provided', async () => {
    const u = await registerUser();
    const res = await api().post(`${AUTH}/change-password`).set(bearer(u.token)).send({ newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.errors.currentPassword).toBeDefined();
  });

  it('signs out other devices (older login tokens stop working) but keeps the device that changed it', async () => {
    const u = await registerUser();
    await nextSecond();
    const res = await change(u.token, u.password);
    const newToken = res.body.data.token as string;

    const old = await api().get(`${AUTH}/me`).set(bearer(u.token));
    expect(old.status).toBe(401);
    expect(old.body.message).toContain('password was changed');
    expect((await api().get('/api/v1/applications').set(bearer(u.token))).status).toBe(401); // every route, not just /me
    expect((await api().get(`${AUTH}/me`).set(bearer(newToken))).status).toBe(200);
  });

  it("does not affect other users' sessions", async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    await nextSecond();
    await change(a.token, a.password);
    expect((await api().get(`${AUTH}/me`).set(bearer(b.token))).status).toBe(200);
  });

  it('cancels any outstanding reset link', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    expect(await prisma.passwordResetToken.count({ where: { userId: u.user.id } })).toBe(1);
    await change(u.token, u.password);
    expect(await prisma.passwordResetToken.count({ where: { userId: u.user.id } })).toBe(0);
    expect((await reset(secret)).status).toBe(400);
  });
});

describe('POST /auth/forgot-password', () => {
  it('gives the same answer for unknown and known emails, so it cannot be used to find accounts', async () => {
    const u = await registerUser();
    const unknown = await forgot('nobody-here@example.com');
    const known = await forgot(u.email);
    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
  });

  it('sends an email only to registered addresses', async () => {
    await forgot('nobody-here@example.com');
    expect(memoryOutbox).toHaveLength(0);

    const u = await registerUser();
    await forgot(u.email);
    expect(memoryOutbox).toHaveLength(1);
    const mail = memoryOutbox[0]!;
    expect(mail.to).toBe(u.email);
    expect(mail.subject).toContain('Reset');
    expect(mail.text).toContain('http://localhost:5173/reset-password?token=');
    expect(mail.text).toContain('expires in 60 minutes');
  });

  it('matches the email case-insensitively', async () => {
    const u = await registerUser();
    await forgot(u.email.toUpperCase());
    expect(memoryOutbox).toHaveLength(1);
  });

  it('stores only a hash of the secret, with the right expiry', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    const rows = await prisma.passwordResetToken.findMany({ where: { userId: u.user.id } });
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.tokenHash).toBe(sha256(secret));
    expect(row.tokenHash).not.toContain(secret);
    expect(secret.length).toBeGreaterThanOrEqual(40);
    const minutes = (row.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(59);
    expect(minutes).toBeLessThanOrEqual(60);
  });

  it('does not send another email if asked again within a minute', async () => {
    const u = await registerUser();
    await forgot(u.email);
    await forgot(u.email);
    await forgot(u.email);
    expect(memoryOutbox).toHaveLength(1);
    expect(await prisma.passwordResetToken.count({ where: { userId: u.user.id } })).toBe(1);
  });

  it('a newer link replaces the older one (only the latest works)', async () => {
    const u = await registerUser();
    const first = await requestLink(u.email);
    await prisma.passwordResetToken.updateMany({ data: { createdAt: new Date(Date.now() - 5 * 60_000) } }); // past the cooldown
    const second = await requestLink(u.email);

    expect(second).not.toBe(first);
    expect((await reset(first)).status).toBe(400);
    expect((await reset(second)).status).toBe(200);
  });

  it('rejects a missing or malformed email with 400', async () => {
    expect((await api().post(`${AUTH}/forgot-password`).send({})).status).toBe(400);
    expect((await forgot('not-an-email')).status).toBe(400);
    expect(memoryOutbox).toHaveLength(0);
  });
});

describe('POST /auth/reset-password', () => {
  it('sets the new password: the old one stops working, the new one works', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    const res = await reset(secret);
    expect(res.status).toBe(200);

    expect((await login(u.email, u.password)).status).toBe(401);
    expect((await login(u.email, NEW_PASSWORD)).status).toBe(200);
  });

  it('works only once', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    expect((await reset(secret)).status).toBe(200);
    const again = await reset(secret, 'Another8Pass');
    expect(again.status).toBe(400);
    expect(again.body.message).toContain('invalid or has expired');
    expect((await login(u.email, NEW_PASSWORD)).status).toBe(200); // the second attempt changed nothing
  });

  it('rejects an expired link and leaves the password alone', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await reset(secret)).status).toBe(400);
    expect((await login(u.email, u.password)).status).toBe(200);
  });

  it('rejects unknown, tampered and malformed links', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    expect((await reset('A'.repeat(43))).status).toBe(400);
    expect((await reset(`${secret}x`)).status).toBe(400);
    expect((await reset(secret.slice(0, -1))).status).toBe(400);
    expect((await reset('short')).status).toBe(400);
    expect((await api().post(`${AUTH}/reset-password`).send({ newPassword: NEW_PASSWORD })).status).toBe(400);
  });

  it('refuses a weak new password without using up the link', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    const weak = await reset(secret, 'short');
    expect(weak.status).toBe(400);
    expect(weak.body.errors.newPassword).toBeDefined();
    expect((await reset(secret)).status).toBe(200); // still usable with a good password
  });

  it('when the same link is used twice at the same moment, exactly one succeeds', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    const results = await Promise.all([reset(secret, 'First9Winner'), reset(secret, 'Second9Winner')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });

  it('signs out every existing session', async () => {
    const u = await registerUser();
    const secret = await requestLink(u.email);
    await nextSecond();
    await reset(secret);
    const res = await api().get(`${AUTH}/me`).set(bearer(u.token));
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('password was changed');
  });

  it("one user's link cannot change another user's password", async () => {
    const a = await registerUser('User A');
    const b = await registerUser('User B');
    const secret = await requestLink(a.email);
    await reset(secret);
    expect((await login(b.email, b.password)).status).toBe(200); // B untouched
  });

  it('expired links are cleaned up by the housekeeping job', async () => {
    const u = await registerUser();
    await requestLink(u.email);
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 3 * 24 * 3_600_000) } });
    expect(await passwordResetRepository.purgeExpiredBefore(new Date(Date.now() - 24 * 3_600_000))).toBe(1);
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });
});

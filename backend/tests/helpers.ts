import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();
export const api = () => request(app);
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

let counter = 0;

export async function registerUser(name = 'Test User') {
  const email = `user${Date.now()}${counter++}@example.com`;
  const res = await api()
    .post('/api/v1/auth/register')
    .send({ name, email, password: 'Passw0rdOK' });
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.data.token as string,
    user: res.body.data.user as { id: string; email: string; name: string },
    email,
    password: 'Passw0rdOK',
  };
}

export async function createApplication(token: string, overrides: Record<string, unknown> = {}) {
  const res = await api()
    .post('/api/v1/applications')
    .set(bearer(token))
    .send({ companyName: 'Acme Corp', jobTitle: 'Backend Engineer', ...overrides });
  return res.body.data as { id: string; status: string; [k: string]: any };
}

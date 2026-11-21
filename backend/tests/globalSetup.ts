import dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

/** Runs once before all tests: verifies the DB and upload folder are test ones, then applies migrations. */
export default function setup() {
  const env = dotenv.parse(readFileSync('.env.test'));
  const dbName = new URL(env.DATABASE_URL ?? '').pathname.replace('/', '');

  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests: database "${dbName}" does not end with "_test". Tests delete all data.`,
    );
  }
  const uploadDir = path.basename(env.UPLOAD_DIR ?? '');
  if (!uploadDir.endsWith('-test')) {
    throw new Error(`Refusing to run tests: UPLOAD_DIR "${env.UPLOAD_DIR}" does not end with "-test".`);
  }

  // Passing DATABASE_URL explicitly overrides anything in .env.
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, ...env },
  });

  // The returned function runs once after all tests: it removes the files the upload tests wrote.
  // (The guard above guarantees this is only ever a folder whose name ends in "-test".)
  return () => rmSync(path.resolve(env.UPLOAD_DIR!), { recursive: true, force: true });
}

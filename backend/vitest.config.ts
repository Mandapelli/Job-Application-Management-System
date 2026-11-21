import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Only .env.test is read (never .env), so tests can't accidentally hit the real database.
const testEnv = dotenv.parse(readFileSync('.env.test'));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: testEnv,
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false, // test files share one database, so run them one at a time
    testTimeout: 20_000,
  },
});

import { createApp } from './app.js';
import { env } from './config/env.js';
import { startNotificationScheduler } from './jobs/notificationScheduler.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
});

// Background job that creates interview and task reminders (not started by tests, which call it directly).
const stopScheduler = startNotificationScheduler();

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down...`);
  stopScheduler();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

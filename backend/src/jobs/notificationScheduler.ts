import { env } from '../config/env.js';
import { notificationService } from '../services/notification.service.js';

const PURGE_EVERY_MS = 6 * 60 * 60 * 1000;

/**
 * Starts the reminder job: once now, then every NOTIFICATION_INTERVAL_SECONDS.
 * Returns a function that stops it. A timer inside the API process is enough for one server; if the API ever runs
 * on several servers it is still safe (duplicates are blocked by the database), and could later move to a job queue.
 */
export function startNotificationScheduler(): () => void {
  const seconds = env.NOTIFICATION_INTERVAL_SECONDS;
  if (seconds <= 0) {
    console.log('Notification reminders are disabled (NOTIFICATION_INTERVAL_SECONDS=0)');
    return () => undefined;
  }

  let running = false; // never let two runs overlap if one is slow
  let lastPurge = 0;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const created = await notificationService.generateDue();
      if (created > 0) console.log(`Created ${created} reminder notification(s)`);
      if (Date.now() - lastPurge > PURGE_EVERY_MS) {
        lastPurge = Date.now();
        await notificationService.purgeOld();
      }
    } catch (error) {
      console.error('Reminder job failed (will retry on the next run):', error);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), seconds * 1000);
  timer.unref(); // the timer alone must not keep the process alive on shutdown
  console.log(`Reminder job running every ${seconds}s`);
  return () => clearInterval(timer);
}

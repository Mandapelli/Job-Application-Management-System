import type { Mail, Mailer } from './types.js';

/** Every email "sent" by the memory mailer, in order. Tests read and clear this. */
export const memoryOutbox: Mail[] = [];

export class MemoryMailer implements Mailer {
  async send(mail: Mail) {
    memoryOutbox.push(mail);
  }
}

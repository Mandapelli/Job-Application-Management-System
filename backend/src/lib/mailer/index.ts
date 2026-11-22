import { env, isProd } from '../../config/env.js';
import { ConsoleMailer } from './console.js';
import { MemoryMailer } from './memory.js';
import { SmtpMailer } from './smtp.js';
import type { Mailer } from './types.js';

let instance: Mailer | undefined;

/** The mailer chosen by EMAIL_DRIVER. Created on first use. */
export function getMailer(): Mailer {
  instance ??= createMailer();
  return instance;
}

function createMailer(): Mailer {
  switch (env.EMAIL_DRIVER) {
    case 'memory':
      return new MemoryMailer();
    case 'smtp': {
      if (!env.SMTP_HOST) throw new Error('EMAIL_DRIVER=smtp needs SMTP_HOST (and usually SMTP_USER and SMTP_PASS).');
      return new SmtpMailer(
        {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        env.EMAIL_FROM,
      );
    }
    case 'console':
      // The console mailer prints password-reset links, which are secrets. Never allow that on a live server.
      if (isProd) throw new Error('EMAIL_DRIVER=console is for development only. Set EMAIL_DRIVER=smtp in production.');
      return new ConsoleMailer();
  }
}

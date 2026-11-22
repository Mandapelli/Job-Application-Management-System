import type { Mail, Mailer } from './types.js';

/** Development mailer: prints the email in the backend terminal instead of sending it. */
export class ConsoleMailer implements Mailer {
  async send(mail: Mail) {
    const line = '─'.repeat(64);
    console.log(`\n${line}\n[email — development only, not actually sent]\nTo:      ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n${line}\n`);
  }
}

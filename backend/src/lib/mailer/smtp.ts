import nodemailer, { type Transporter } from 'nodemailer';
import type { Mail, Mailer } from './types.js';

/** Sends real email through an SMTP server (Gmail, SendGrid, Mailgun, AWS SES SMTP, ...). */
export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(
    options: { host: string; port: number; secure: boolean; user?: string; pass?: string },
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user ? { user: options.user, pass: options.pass ?? '' } : undefined,
    });
  }

  async send(mail: Mail) {
    await this.transport.sendMail({ from: this.from, to: mail.to, subject: mail.subject, text: mail.text });
  }
}

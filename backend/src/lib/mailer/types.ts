export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Sends email. The app only talks to this interface, so the delivery method can change without touching the features. */
export interface Mailer {
  send(mail: Mail): Promise<void>;
}

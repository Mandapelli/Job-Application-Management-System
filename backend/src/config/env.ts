import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Lets the MySQL driver fetch the server's RSA key during login (needed by MySQL 8 after a restart).
  // Unset = on in development/test, off in production. Set it explicitly to override.
  DB_ALLOW_PUBLIC_KEY_RETRIEVAL: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // How long a "forgot password" link works.
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
  // Login tokens are checked against the user's password-change time. The answer is remembered this long per user
  // (0 = ask the database every time). A changed password signs out other devices within this time.
  AUTH_STATE_CACHE_SECONDS: z.coerce.number().int().min(0).max(300).default(30),

  // Email (for "forgot password"). console = print the email in the backend terminal (development only),
  // smtp = send through a real mail server, memory = keep in memory (used by tests).
  EMAIL_DRIVER: z.enum(['console', 'smtp', 'memory']).default('console'),
  EMAIL_FROM: z.string().min(3).default('CareerTrack <no-reply@careertrack.local>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(), // true = TLS from the start (usually port 465)
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(50).default(5),
  // How often the reminder job looks for upcoming interviews and due tasks. 0 turns the job off.
  NOTIFICATION_INTERVAL_SECONDS: z.coerce.number().int().min(0).default(60),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

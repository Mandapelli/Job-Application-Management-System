import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
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

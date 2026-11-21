import { z } from 'zod';

// Mirrors the backend rules so users get instant feedback; the server still re-validates.
const email = z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;

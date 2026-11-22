import { z } from 'zod';

// Mirrors the backend rules so users get instant feedback; the server still re-validates.
const email = z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email'));

const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const confirmPassword = z.string().min(1, 'Type the new password again');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ newPassword, confirmPassword })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'The two passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword,
    confirmPassword,
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'The two passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'Choose a password different from the current one',
    path: ['newPassword'],
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

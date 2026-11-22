import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email address').max(255));

/** The rules for a new password, shared by registration, change-password and reset-password. */
export const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt only uses the first 72 bytes
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email,
  password: newPassword,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(72),
  newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'This reset link is not valid').max(200, 'This reset link is not valid'),
  newPassword,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

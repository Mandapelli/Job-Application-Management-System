import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

export const authRouter = Router();

const inTest = process.env.NODE_ENV === 'test';

// Stricter limit on credential endpoints to slow brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: inTest ? 10_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

// Even stricter for "forgot password": each request can send an email.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: inTest ? 10_000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests, please try again later' },
});

authRouter.post('/register', authLimiter, validateBody(registerSchema), authController.register);
authRouter.post('/login', authLimiter, validateBody(loginSchema), authController.login);
authRouter.get('/me', authenticate, authController.me);
authRouter.post('/logout', authenticate, authController.logout);

authRouter.post('/change-password', authenticate, authLimiter, validateBody(changePasswordSchema), authController.changePassword);
authRouter.post('/forgot-password', forgotLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
authRouter.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), authController.resetPassword);

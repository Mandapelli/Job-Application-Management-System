import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';

export const authRouter = Router();

// Stricter limit on credential endpoints to slow brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 10_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

authRouter.post('/register', authLimiter, validateBody(registerSchema), authController.register);
authRouter.post('/login', authLimiter, validateBody(loginSchema), authController.login);
authRouter.get('/me', authenticate, authController.me);
authRouter.post('/logout', authenticate, authController.logout);

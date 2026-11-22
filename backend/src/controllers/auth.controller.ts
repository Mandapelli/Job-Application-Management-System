import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    sendSuccess(res, result, { status: 201, message: 'Registration successful' });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result, { message: 'Login successful' });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user!.id);
    sendSuccess(res, { user });
  }),

  // JWTs are stateless: the client discards the token. This endpoint exists so the
  // frontend has one place to call, and can later add server-side token revocation.
  logout: asyncHandler(async (_req, res) => {
    sendSuccess(res, null, { message: 'Logged out successfully' });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user!.id, req.body);
    sendSuccess(res, result, { message: 'Password changed. Other devices have been signed out.' });
  }),

  // Always the same answer, whether or not the email has an account.
  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body);
    sendSuccess(res, null, { message: 'If an account exists for that email, a reset link has been sent.' });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body);
    sendSuccess(res, null, { message: 'Password updated. You can now log in.' });
  }),
};

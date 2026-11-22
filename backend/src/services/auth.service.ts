import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { invalidateAuthState } from '../lib/authState.js';
import { getMailer } from '../lib/mailer/index.js';
import { INVALID_LINK, passwordResetRepository } from '../repositories/passwordReset.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator.js';
import { AppError } from '../utils/AppError.js';

const BCRYPT_ROUNDS = env.BCRYPT_ROUNDS; // 12 by default; tests use a low value for speed
// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);
/** Asking for a reset link again within this time sends nothing new (stops mail-bombing someone's inbox). */
const RESET_COOLDOWN_MS = 60_000;

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmailWithPassword(input.email);
    if (existing) throw AppError.conflict('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return { user, token: signToken(user.id) };
  },

  async login(input: LoginInput) {
    const found = await userRepository.findByEmailWithPassword(input.email);
    const valid = await bcrypt.compare(input.password, found?.passwordHash ?? DUMMY_HASH);
    if (!found || !valid) throw AppError.unauthorized('Invalid email or password');

    const user = { id: found.id, name: found.name, email: found.email, createdAt: found.createdAt };
    return { user, token: signToken(user.id) };
  },

  async getCurrentUser(userId: string) {
    const user = await userRepository.findPublicById(userId);
    if (!user) throw AppError.unauthorized('Account no longer exists');
    return user;
  },

  /**
   * A logged-in user picks a new password. They must know the current one. Every other device is signed out,
   * and the response carries a fresh token so THIS device stays signed in.
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const found = await userRepository.findByIdWithPassword(userId);
    if (!found) throw AppError.unauthorized('Account no longer exists');

    if (!(await bcrypt.compare(input.currentPassword, found.passwordHash))) {
      throw AppError.badRequest('Current password is incorrect', { currentPassword: ['Current password is incorrect'] });
    }
    if (await bcrypt.compare(input.newPassword, found.passwordHash)) {
      throw AppError.badRequest('Choose a different password', {
        newPassword: ['New password must be different from the current one'],
      });
    }

    await userRepository.setPassword(userId, await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS));
    invalidateAuthState(userId);

    const user = { id: found.id, name: found.name, email: found.email, createdAt: found.createdAt };
    return { user, token: signToken(userId) };
  },

  /**
   * Starts a password reset. Whether or not the email is registered, the caller gets the same answer, so this
   * cannot be used to find out who has an account. Only registered emails actually receive a link.
   */
  async forgotPassword(input: ForgotPasswordInput) {
    const user = await userRepository.findPublicByEmail(input.email);
    if (!user) return;

    const last = await passwordResetRepository.latestCreatedAt(user.id);
    if (last && Date.now() - last.getTime() < RESET_COOLDOWN_MS) return;

    // The secret is only ever in the email. The database keeps just its hash.
    const secret = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);
    await passwordResetRepository.replaceFor(user.id, sha256(secret), expiresAt);

    const link = `${env.CLIENT_URL.replace(/\/$/, '')}/reset-password?token=${secret}`;
    // Not awaited: a slow mail server must not slow the response (which would also reveal that the email exists).
    void getMailer()
      .send({
        to: user.email,
        subject: 'Reset your CareerTrack password',
        text:
          `Hi ${user.name},\n\n` +
          `We received a request to reset your CareerTrack password. Open this link to choose a new one. ` +
          `It works once and expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes:\n\n${link}\n\n` +
          `If you did not ask for this, ignore this email. Your password will not change.`,
      })
      .catch((error) => console.error('Could not send the password reset email:', error));
  },

  /** Completes a reset with the link's secret. Every device is signed out, so the user logs in again. */
  async resetPassword(input: ResetPasswordInput) {
    const now = new Date();
    const link = await passwordResetRepository.findUsable(sha256(input.token), now);
    if (!link) throw AppError.badRequest(INVALID_LINK);

    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    await passwordResetRepository.consumeAndSetPassword(link.id, link.userId, passwordHash, now);
    invalidateAuthState(link.userId);
  },
};

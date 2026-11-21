import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import type { LoginInput, RegisterInput } from '../validators/auth.validator.js';
import { AppError } from '../utils/AppError.js';

const BCRYPT_ROUNDS = env.BCRYPT_ROUNDS; // 12 by default; tests use a low value for speed
// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

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
};

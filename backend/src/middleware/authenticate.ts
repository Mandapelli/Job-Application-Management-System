import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getAuthState } from '../lib/authState.js';
import { AppError } from '../utils/AppError.js';

/** Requires "Authorization: Bearer <token>" and sets req.user = { id }. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw AppError.unauthorized('Authentication required');

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(header.slice(7), env.JWT_SECRET);
    } catch (err) {
      throw AppError.unauthorized(err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token');
    }
    if (typeof payload === 'string' || typeof payload.sub !== 'string') throw AppError.unauthorized('Invalid token');

    // The token is signed correctly, but is it still good? The account may have been deleted, or the password
    // changed after this token was issued (e.g. a reset after a lost device), which must end old sessions.
    const state = await getAuthState(payload.sub);
    if (!state) throw AppError.unauthorized('Account no longer exists');
    if (state.passwordChangedAt !== null && (payload.iat ?? 0) < Math.floor(state.passwordChangedAt / 1000)) {
      throw AppError.unauthorized('Your password was changed. Please log in again.');
    }

    req.user = { id: payload.sub };
    next();
  } catch (error) {
    next(error);
  }
};

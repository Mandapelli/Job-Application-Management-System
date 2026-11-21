import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/** Requires "Authorization: Bearer <token>" and sets req.user = { id }. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication required'));
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      return next(AppError.unauthorized('Invalid token'));
    }
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    next(AppError.unauthorized(expired ? 'Token expired' : 'Invalid token'));
  }
};

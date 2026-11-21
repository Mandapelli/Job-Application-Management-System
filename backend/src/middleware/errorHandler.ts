import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { z, ZodError } from 'zod';
import { env, isProd } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: z.flattenError(err).fieldErrors,
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message, errors: err.details });
    return;
  }
  // Upload problems (too big, wrong field name, too many files...)
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooBig ? 413 : 400).json({
      success: false,
      message: tooBig ? `File is too large (maximum ${env.MAX_UPLOAD_MB} MB)` : 'Invalid upload',
    });
    return;
  }
  // Malformed JSON body or oversized payload (thrown by express.json)
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Malformed JSON in request body' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'Request body too large' });
    return;
  }
  console.error(err);
  res.status(500).json({
    success: false,
    message: isProd ? 'Internal server error' : String(err?.message ?? err),
  });
};

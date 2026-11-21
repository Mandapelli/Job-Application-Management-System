import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/** Validates req.body against a Zod schema and replaces it with the parsed (clean) value. */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    // A ZodError thrown here is turned into a 400 by the central error handler.
    req.body = schema.parse(req.body ?? {});
    next();
  };

/** Validates req.query and exposes the parsed value as res.locals.query (req.query is read-only in Express 5). */
export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    res.locals.query = schema.parse(req.query);
    next();
  };

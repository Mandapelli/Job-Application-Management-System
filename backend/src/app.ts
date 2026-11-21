import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }),
  );

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

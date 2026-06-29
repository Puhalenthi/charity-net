import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { itemsRouter } from './routes/items.js';
import { wishlistsRouter } from './routes/wishlists.js';
import { adminRouter } from './routes/admin.js';
import { geocodeRouter } from './routes/geocode.js';
import { jobsRouter } from './routes/jobs.js';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  const allowed = env().ALLOWED_ORIGINS
    ? env().ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : true;
  app.use(cors({ origin: allowed, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(authMiddleware);
  app.use(generalLimiter);

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  // Routes are served under /api to match the Firebase Hosting rewrite, which
  // forwards the full `/api/**` path to this service unchanged.
  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/me', meRouter);
  api.use('/items', itemsRouter);
  api.use('/charities', wishlistsRouter);
  api.use('/admin', adminRouter);
  api.use('/geocode', geocodeRouter);
  api.use('/jobs', jobsRouter);
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

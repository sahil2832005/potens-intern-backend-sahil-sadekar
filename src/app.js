import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import routes from './routes/index.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './lib/logger.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(routes);
  app.use(errorHandler);

  return app;
}

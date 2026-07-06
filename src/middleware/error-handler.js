import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const code = typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';
  const message = statusCode === 500 && config.isProduction ? 'Internal server error' : err.message;

  logger.error({ err, requestId: req.id, path: req.path, method: req.method }, message);

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(config.isProduction ? {} : { stack: err.stack }),
    },
    requestId: req.id,
  });
}

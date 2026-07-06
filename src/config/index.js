import { parseEnv } from './env.schema.js';

const env = parseEnv();

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  apiKey: env.API_KEY,
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  logLevel: env.LOG_LEVEL,
  isProduction: env.NODE_ENV === 'production',
};

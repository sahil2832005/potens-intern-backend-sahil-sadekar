import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import {
  connectDatabase,
  disconnectDatabase,
  runMigrations,
} from './lib/prisma.js';

async function start() {
  runMigrations();
  await connectDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'server started');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.fatal({ err }, 'failed to start server');
  process.exit(1);
});

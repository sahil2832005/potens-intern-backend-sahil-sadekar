import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export const prisma = new PrismaClient({
  log: config.isProduction ? ['error'] : ['warn', 'error'],
});

export function runMigrations() {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' });
  logger.info('migrations applied');
}

export async function connectDatabase() {
  await prisma.$connect();
  logger.info('database connected');
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('database disconnected');
}

export async function isDatabaseReady() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

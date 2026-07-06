import { Router } from 'express';
import { isDatabaseReady } from '../lib/prisma.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (_req, res) => {
  const ready = await isDatabaseReady();

  if (!ready) {
    res.status(503).json({ status: 'not_ready' });
    return;
  }

  res.status(200).json({ status: 'ready' });
});

export default router;

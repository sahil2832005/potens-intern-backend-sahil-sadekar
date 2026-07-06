import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { logWriteRateLimiter } from '../middleware/rate-limiter.js';
import { validate } from '../middleware/validate.js';
import { createLogSchema } from '../validators/log.schema.js';
import { appendLog } from '../services/log.service.js';

const router = Router();

router.use(authenticate);

router.post('/', logWriteRateLimiter, validate(createLogSchema), async (req, res) => {
  const entry = await appendLog(req.body);
  res.status(201).json(entry);
});

export default router;

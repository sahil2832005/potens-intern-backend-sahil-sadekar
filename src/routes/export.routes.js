import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { exportLogs } from '../services/log.service.js';
import { exportQuerySchema } from '../validators/log.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(exportQuerySchema, 'query'), async (req, res) => {
  const result = await exportLogs(req.validatedQuery);
  res.status(200).json(result);
});

export default router;

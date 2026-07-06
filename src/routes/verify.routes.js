import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { verifyFullChain } from '../services/verify.service.js';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res) => {
  const result = await verifyFullChain();
  res.status(200).json(result);
});

export default router;

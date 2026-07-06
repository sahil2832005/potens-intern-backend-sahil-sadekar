import { z } from 'zod';

export const createLogSchema = z
  .object({
    actor: z.string().trim().min(1),
    action: z.string().trim().min(1),
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const logIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, 'must be a positive numeric id'),
});

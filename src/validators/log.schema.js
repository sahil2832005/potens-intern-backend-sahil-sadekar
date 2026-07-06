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

export const exportQuerySchema = z
  .object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    actor: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((query) => !query.from || !query.to || new Date(query.from) <= new Date(query.to), {
    message: 'from must be before or equal to to',
    path: ['from'],
  });

import { z } from 'zod';

export const auditLogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

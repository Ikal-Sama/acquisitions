import { z } from 'zod';

export const auditLogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createAuditLogSchema = z.object({
  user_id: z.coerce.number().int().positive().optional().nullable(),
  action: z.string().max(50).trim(),
  entity_type: z.string().max(50).trim(),
  entity_id: z.coerce.number().int().positive().optional().nullable(),
  old_values: z.any().optional().nullable(),
  new_values: z.any().optional().nullable(),
  ip_address: z.string().max(45).trim().optional().nullable(),
  user_agent: z.string().max(500).trim().optional().nullable(),
});

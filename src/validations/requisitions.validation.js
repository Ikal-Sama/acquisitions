import { z } from 'zod';

export const requisitionIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createRequisitionSchema = z.object({
  title: z.string().min(2).max(255).trim(),
  description: z.string().trim().optional(),
  department_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  estimated_cost: z.coerce.number().positive(),
  vendor_id: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().trim().optional(),
});

export const updateRequisitionSchema = z
  .object({
    title: z.string().min(2).max(255).trim().optional(),
    description: z.string().trim().optional(),
    department_id: z.coerce.number().int().positive().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    estimated_cost: z.coerce.number().positive().optional(),
    vendor_id: z.coerce.number().int().positive().optional().nullable(),
    notes: z.string().trim().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export const approveRequisitionSchema = z.object({
  notes: z.string().trim().optional(),
});

export const rejectRequisitionSchema = z.object({
  notes: z.string().trim().optional(),
});

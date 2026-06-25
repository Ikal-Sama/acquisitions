import { z } from 'zod';

export const assetIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createAssetSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  serial_number: z.string().max(255).trim().optional(),
  purchase_order_id: z.coerce.number().int().positive().optional().nullable(),
  purchase_price: z.coerce.number().nonnegative().optional(),
  location: z.string().max(255).trim().optional(),
  warranty_expiry: z.string().datetime().optional().nullable(),
  notes: z.string().trim().optional(),
});

export const updateAssetSchema = z
  .object({
    name: z.string().min(1).max(255).trim().optional(),
    serial_number: z.string().max(255).trim().optional(),
    status: z
      .enum(['available', 'assigned', 'maintenance', 'retired'])
      .optional(),
    location: z.string().max(255).trim().optional(),
    warranty_expiry: z.string().datetime().optional().nullable(),
    notes: z.string().trim().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export const assignAssetSchema = z.object({
  assigned_to: z.coerce.number().int().positive(),
});

export const unassignAssetSchema = z.object({});

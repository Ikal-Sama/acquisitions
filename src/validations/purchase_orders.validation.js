import { z } from 'zod';

export const purchaseOrderIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createPurchaseOrderSchema = z.object({
  requisition_id: z.coerce.number().int().positive().optional().nullable(),
  vendor_id: z.coerce.number().int().positive(),
  total_amount: z.coerce.number().positive(),
  payment_terms: z.string().max(100).trim().optional(),
  expected_delivery_date: z.string().datetime().optional().nullable(),
  shipping_address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const updatePurchaseOrderSchema = z
  .object({
    vendor_id: z.coerce.number().int().positive().optional(),
    total_amount: z.coerce.number().positive().optional(),
    payment_terms: z.string().max(100).trim().optional(),
    expected_delivery_date: z.string().datetime().optional().nullable(),
    shipping_address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export const createPoItemSchema = z.object({
  description: z.string().min(1).max(500).trim(),
  quantity: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().positive(),
});

export const updatePoItemSchema = z
  .object({
    description: z.string().min(1).max(500).trim().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    unit_price: z.coerce.number().positive().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export const poItemIdSchema = z.object({
  id: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
});

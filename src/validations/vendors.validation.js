import { z } from 'zod';

export const vendorIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createVendorSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  email: z.email().max(255).toLowerCase().trim().optional(),
  phone: z.string().max(50).trim().optional(),
  address: z.string().max(500).trim().optional(),
  website: z.string().url().max(255).trim().optional(),
});

export const updateVendorSchema = z
  .object({
    name: z.string().min(2).max(255).trim().optional(),
    email: z.email().max(255).toLowerCase().trim().optional(),
    phone: z.string().max(50).trim().optional(),
    address: z.string().max(500).trim().optional(),
    website: z.string().url().max(255).trim().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

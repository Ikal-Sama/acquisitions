import { z } from 'zod';

export const departmentIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  code: z.string().min(2).max(50).trim().toUpperCase(),
  description: z.string().trim().optional(),
});

export const updateDepartmentSchema = z
  .object({
    name: z.string().min(2).max(255).trim().optional(),
    code: z.string().min(2).max(50).trim().toUpperCase().optional(),
    description: z.string().trim().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

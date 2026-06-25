import { z } from 'zod';

export const budgetIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createBudgetSchema = z.object({
  department_id: z.coerce.number().int().positive(),
  fiscal_year: z.coerce.number().int().min(2020).max(2099),
  allocated_amount: z.coerce.number().nonnegative(),
});

export const updateBudgetSchema = z
  .object({
    allocated_amount: z.coerce.number().nonnegative().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

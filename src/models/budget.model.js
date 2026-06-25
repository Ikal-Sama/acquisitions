import {
  pgTable,
  serial,
  integer,
  decimal,
  timestamp,
} from 'drizzle-orm/pg-core';
import { departments } from './department.model.js';

export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  department_id: integer('department_id')
    .notNull()
    .references(() => departments.id),
  fiscal_year: integer('fiscal_year').notNull(),
  allocated_amount: decimal('allocated_amount', {
    precision: 14,
    scale: 2,
  }).notNull(),
  spent_amount: decimal('spent_amount', { precision: 14, scale: 2 })
    .default('0')
    .notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

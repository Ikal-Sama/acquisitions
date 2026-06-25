import {
  pgTable,
  serial,
  varchar,
  integer,
  decimal,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './user.model.js';
import { vendors } from './vendor.model.js';
import { departments } from './department.model.js';

export const requisitions = pgTable('requisitions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  department_id: integer('department_id')
    .notNull()
    .references(() => departments.id),
  quantity: integer('quantity').notNull(),
  estimated_cost: decimal('estimated_cost', {
    precision: 12,
    scale: 2,
  }).notNull(),
  status: varchar('status', { length: 50 })
    .default('pending_approval')
    .notNull(),
  requested_by: integer('requested_by')
    .notNull()
    .references(() => users.id),
  approved_by: integer('approved_by').references(() => users.id),
  vendor_id: integer('vendor_id').references(() => vendors.id),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

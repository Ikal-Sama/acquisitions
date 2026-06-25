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
import { purchaseOrders } from './purchase_order.model.js';

export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  asset_tag: varchar('asset_tag', { length: 50 }).notNull().unique(),
  serial_number: varchar('serial_number', { length: 255 }),
  status: varchar('status', { length: 50 }).default('available').notNull(),
  assigned_to: integer('assigned_to').references(() => users.id),
  purchase_order_id: integer('purchase_order_id').references(
    () => purchaseOrders.id
  ),
  purchase_price: decimal('purchase_price', { precision: 12, scale: 2 }),
  location: varchar('location', { length: 255 }),
  warranty_expiry: timestamp('warranty_expiry'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

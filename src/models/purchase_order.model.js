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
import { requisitions } from './requisition.model.js';

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  po_number: varchar('po_number', { length: 50 }).notNull().unique(),
  requisition_id: integer('requisition_id').references(() => requisitions.id),
  vendor_id: integer('vendor_id')
    .notNull()
    .references(() => vendors.id),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  total_amount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  payment_terms: varchar('payment_terms', { length: 100 }),
  expected_delivery_date: timestamp('expected_delivery_date'),
  shipping_address: text('shipping_address'),
  notes: text('notes'),
  created_by: integer('created_by')
    .notNull()
    .references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchase_order_id: integer('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  total_price: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

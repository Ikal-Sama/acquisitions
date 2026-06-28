import {
  pgTable,
  serial,
  integer,
  varchar,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './user.model.js';

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  entity_type: varchar('entity_type', { length: 50 }).notNull(),
  entity_id: integer('entity_id'),
  old_values: jsonb('old_values'),
  new_values: jsonb('new_values'),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: varchar('user_agent', { length: 500 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

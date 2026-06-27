import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './user.model.js';

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  resource: varchar('resource', { length: 50 }).notNull(),
  resourceId: integer('resource_id'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

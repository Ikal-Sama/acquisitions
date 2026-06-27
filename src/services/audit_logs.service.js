import {
  eq,
  and,
  ilike,
  or,
  sql,
  asc,
  desc,
  gte,
  lte,
  gt,
  lt,
} from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { auditLogs } from '#models/audit_log.model.js';
import { escapeLike } from '#utils/format.js';

const applyFilters = (model, filters) =>
  filters.map(f => {
    switch (f.operator) {
      case 'eq':
        return eq(model[f.field], f.value);
      case 'gte':
        return gte(model[f.field], f.value);
      case 'lte':
        return lte(model[f.field], f.value);
      case 'gt':
        return gt(model[f.field], f.value);
      case 'lt':
        return lt(model[f.field], f.value);
    }
  });

export const logAudit = async (
  userId,
  action,
  resource,
  resourceId,
  details
) => {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      resource,
      resourceId: resourceId ?? null,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (e) {
    logger.error('Failed to write audit log', e);
  }
};

export const getAllAuditLogs = async (
  filters = [],
  pagination = {},
  search = '',
  sort = [],
  fields = []
) => {
  try {
    const { limit, offset } = pagination;

    const conditions = [...applyFilters(auditLogs, filters)];

    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.action, `%${escapeLike(search)}%`),
          ilike(auditLogs.resource, `%${escapeLike(search)}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: sql`count(*)` })
      .from(auditLogs)
      .where(where);

    let orderBy;

    if (sort.length > 0) {
      orderBy = sort.map(s =>
        s.direction === 'desc'
          ? desc(auditLogs[s.field])
          : asc(auditLogs[s.field])
      );
    } else {
      orderBy = [desc(auditLogs.createdAt)];
    }

    let queryBuilder;

    if (fields.length > 0) {
      queryBuilder = db
        .select(Object.fromEntries(fields.map(f => [f, auditLogs[f]])))
        .from(auditLogs);
    } else {
      queryBuilder = db.select().from(auditLogs);
    }

    const data = await queryBuilder
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return { data, total: Number(total) };
  } catch (e) {
    logger.error('Error getting audit logs', e);
    throw e;
  }
};

export const getAuditLogById = async id => {
  try {
    const [log] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);

    if (!log) throw new Error('Audit log not found');

    return log;
  } catch (e) {
    logger.error(`Error getting audit log by id ${id}`, e);
    throw e;
  }
};

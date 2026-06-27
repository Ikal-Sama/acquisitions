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

const FIELD_MAP = {
  action: auditLogs.action,
  resource: auditLogs.resource,
  resource_id: auditLogs.resourceId,
  user_id: auditLogs.userId,
  details: auditLogs.details,
  created_at: auditLogs.createdAt,
};

const resolveField = field => FIELD_MAP[field] || auditLogs[field];

const applyFilters = filters =>
  filters.map(f => {
    const column = resolveField(f.field);
    switch (f.operator) {
      case 'eq':
        return eq(column, f.value);
      case 'gte':
        return gte(column, f.value);
      case 'lte':
        return lte(column, f.value);
      case 'gt':
        return gt(column, f.value);
      case 'lt':
        return lt(column, f.value);
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

    const conditions = [...applyFilters(filters)];

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
          ? desc(resolveField(s.field))
          : asc(resolveField(s.field))
      );
    } else {
      orderBy = [desc(auditLogs.createdAt)];
    }

    let queryBuilder;

    if (fields.length > 0) {
      queryBuilder = db
        .select(Object.fromEntries(fields.map(f => [f, resolveField(f)])))
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

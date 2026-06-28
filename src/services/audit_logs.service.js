import { eq, and, asc, desc, sql, gte, lte, gt, lt } from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { auditLogs } from '#models/audit_log.model.js';

class AuditLogNotFoundError extends Error {
  constructor(id) {
    super(`Audit log not found: ${id}`);
    this.name = 'AuditLogNotFoundError';
  }
}

const AUDIT_LOG_FIELDS = new Set([
  'id',
  'user_id',
  'action',
  'entity_type',
  'entity_id',
  'ip_address',
  'user_agent',
  'created_at',
]);

const resolveColumn = (model, field) => {
  if (!AUDIT_LOG_FIELDS.has(field) || !model[field]) {
    throw new Error(`Unsupported audit log field: ${field}`);
  }
  return model[field];
};

const applyFilters = (model, filters) =>
  filters
    .map(f => {
      const column = resolveColumn(model, f.field);

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
        default:
          throw new Error(`Unsupported filter operator: ${f.operator}`);
      }
    })
    .filter(Boolean);

export const log = async data => {
  try {
    const [entry] = await db.insert(auditLogs).values(data).returning();

    logger.info(
      `Audit log: ${data.action} on ${data.entity_type}#${data.entity_id}`
    );

    return entry;
  } catch (e) {
    logger.error('Failed to write audit log', e);
  }
};

export const getAllAuditLogs = async (
  filters = [],
  pagination = {},
  sort = []
) => {
  try {
    const { limit, offset } = pagination;

    const conditions = [...applyFilters(auditLogs, filters)];

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
      orderBy = [desc(auditLogs.created_at)];
    }

    const data = await db
      .select()
      .from(auditLogs)
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
    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);

    if (!entry) throw new AuditLogNotFoundError(id);

    return entry;
  } catch (e) {
    logger.error(`Error getting audit log by id ${id}`, e);
    throw e;
  }
};

export const logAudit = async (
  req,
  action,
  entityType,
  entityId,
  oldValues,
  newValues
) => {
  return log({
    user_id: req.user?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_values: oldValues ?? null,
    new_values: newValues ?? null,
    ip_address: req.ip,
    user_agent: req.get('User-Agent') ?? null,
  });
};

export const deleteAuditLog = async id => {
  try {
    const [deleted] = await db
      .delete(auditLogs)
      .where(eq(auditLogs.id, id))
      .returning();

    if (!deleted) throw new AuditLogNotFoundError(id);

    logger.info(`Audit log (ID: ${id}) deleted`);

    return deleted;
  } catch (e) {
    logger.error(`Error deleting audit log ${id}`, e);
    throw e;
  }
};

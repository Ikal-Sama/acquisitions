import {
  parsePagination,
  paginationMeta,
  parseSort,
  parseFilters,
} from '#utils/pagination.js';
import {
  getAllAuditLogs,
  getAuditLogById,
  deleteAuditLog,
} from '#services/audit_logs.service.js';
import { auditLogIdSchema } from '#validations/audit_logs.validation.js';
import { formatValidationError } from '#utils/format.js';
import logger from '#config/logger.js';

const FILTER_CONFIG = {
  action: { type: 'string', operators: ['eq'] },
  entity_type: { type: 'string', operators: ['eq'] },
  entity_id: { type: 'integer', operators: ['eq'] },
  user_id: { type: 'integer', operators: ['eq'] },
  created_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
};

export const fetchAllAuditLogs = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query, FILTER_CONFIG);
    const pagination = parsePagination(req.query);
    const sort = parseSort(req.query, ['action', 'entity_type', 'created_at']);

    const { data, total } = await getAllAuditLogs(filters, pagination, sort);

    res.status(200).json({
      message: 'Successfully retrieved audit logs',
      audit_logs: data,
      count: data.length,
      pagination: paginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    logger.error('Error fetching audit logs', error);
    next(error);
  }
};

export const fetchAuditLogById = async (req, res, next) => {
  try {
    const validationResult = auditLogIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    const entry = await getAuditLogById(id);

    res.status(200).json({
      message: 'Successfully retrieved audit log',
      audit_log: entry,
    });
  } catch (e) {
    if (e.message === 'Audit log not found') {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    logger.error('Error fetching audit log by id', e);
    next(e);
  }
};

export const deleteAuditLogById = async (req, res, next) => {
  try {
    const validationResult = auditLogIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    const entry = await deleteAuditLog(id);

    res.status(200).json({
      message: 'Audit log deleted successfully',
      audit_log: entry,
    });
  } catch (e) {
    if (e.message === 'Audit log not found') {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    logger.error('Error deleting audit log', e);
    next(e);
  }
};

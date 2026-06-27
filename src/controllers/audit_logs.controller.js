import logger from '#config/logger.js';
import {
  parsePagination,
  paginationMeta,
  parseSort,
  parseFields,
  parseFilters,
} from '#utils/pagination.js';
import {
  getAllAuditLogs,
  getAuditLogById,
} from '#services/audit_logs.service.js';
import { auditLogIdSchema } from '#validations/audit_logs.validation.js';
import { formatValidationError } from '#utils/format.js';

const FILTER_CONFIG = {
  action: { type: 'string', operators: ['eq'] },
  resource: { type: 'string', operators: ['eq'] },
  resource_id: { type: 'integer', operators: ['eq'] },
  user_id: { type: 'integer', operators: ['eq'] },
  created_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
};

export const fetchAllAuditLogs = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query, FILTER_CONFIG);
    const pagination = parsePagination(req.query);
    const search = req.query.search || '';
    const sort = parseSort(req.query, ['action', 'resource', 'created_at']);
    const fields = parseFields(req.query, [
      'action',
      'resource',
      'resource_id',
      'user_id',
      'details',
      'created_at',
    ]);

    logger.info('Getting audit logs...');

    const { data, total } = await getAllAuditLogs(
      filters,
      pagination,
      search,
      sort,
      fields
    );

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

    logger.info(`Getting audit log by id ${id}...`);

    const log = await getAuditLogById(id);

    res.status(200).json({
      message: 'Successfully retrieved audit log',
      audit_log: log,
    });
  } catch (e) {
    if (e.message === 'Audit log not found') {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    logger.error('Error fetching audit log by id', e);
    next(e);
  }
};

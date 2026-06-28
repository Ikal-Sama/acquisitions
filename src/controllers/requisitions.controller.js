import logger from '#config/logger.js';
import {
  parsePagination,
  paginationMeta,
  parseSort,
  parseFields,
  parseFilters,
} from '#utils/pagination.js';
import {
  getAllRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisition,
  approveRequisition,
  rejectRequisition,
  deleteRequisition,
} from '#services/requisitions.service.js';
import {
  requisitionIdSchema,
  createRequisitionSchema,
  updateRequisitionSchema,
  approveRequisitionSchema,
  rejectRequisitionSchema,
} from '#validations/requisitions.validation.js';
import { formatValidationError } from '#utils/format.js';
import { logAudit } from '#services/audit_logs.service.js';

const FILTER_CONFIG = {
  status: { type: 'string', operators: ['eq'] },
  department_id: { type: 'integer', operators: ['eq'] },
  requested_by: { type: 'integer', operators: ['eq'] },
  approved_by: { type: 'integer', operators: ['eq'] },
  vendor_id: { type: 'integer', operators: ['eq'] },
  quantity: { type: 'integer', operators: ['gte', 'lte', 'gt', 'lt'] },
  estimated_cost: {
    type: 'number',
    operators: ['eq', 'gte', 'lte', 'gt', 'lt'],
  },
  created_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
  updated_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
};

export const fetchAllRequisitions = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query, FILTER_CONFIG);

    // Regular users can only see their own requisitions
    if (req.user.role !== 'admin') {
      filters.push({
        field: 'requested_by',
        operator: 'eq',
        value: req.user.id,
      });
    }

    const pagination = parsePagination(req.query);
    const search = req.query.search || '';
    const sort = parseSort(req.query, [
      'title',
      'status',
      'estimated_cost',
      'created_at',
    ]);
    const fields = parseFields(req.query, [
      'title',
      'description',
      'status',
      'estimated_cost',
      'department_id',
      'requested_by',
      'created_at',
    ]);

    logger.info('Getting requisitions...');

    const { data, total } = await getAllRequisitions(
      filters,
      pagination,
      search,
      sort,
      fields
    );

    res.status(200).json({
      message: 'Successfully retrieved requisitions',
      requisitions: data,
      count: data.length,
      pagination: paginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    logger.error('Error fetching requisitions', error);
    next(error);
  }
};

export const fetchRequisitionById = async (req, res, next) => {
  try {
    const validationResult = requisitionIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting requisition by id ${id}...`);

    const requisition = await getRequisitionById(id);

    // Regular users can only view their own requisitions
    if (req.user.role !== 'admin' && requisition.requested_by !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.status(200).json({
      message: 'Successfully retrieved requisition',
      requisition,
    });
  } catch (e) {
    if (e.message === 'Requisition not found') {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    logger.error('Error fetching requisition by id', e);
    next(e);
  }
};

export const createNewRequisition = async (req, res, next) => {
  try {
    const validationResult = createRequisitionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    logger.info('Creating new requisition...');

    const requisition = await createRequisition(
      validationResult.data,
      req.user.id
    );

    await logAudit(req, 'CREATE', 'requisition', requisition.id);

    res.status(201).json({
      message: 'Requisition created successfully',
      requisition,
    });
  } catch (e) {
    logger.error('Error creating requisition', e);
    next(e);
  }
};

export const updateRequisitionById = async (req, res, next) => {
  try {
    const idValidation = requisitionIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateRequisitionSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    // Only the requester or an admin can update
    const existing = await getRequisitionById(id);

    if (req.user.role !== 'admin' && existing.requested_by !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: you can only update your own requisitions',
      });
    }

    logger.info(`Updating requisition ${id}...`);

    const requisition = await updateRequisition(id, updates);

    await logAudit(req, 'UPDATE', 'requisition', id, { id }, requisition);

    res.status(200).json({
      message: 'Requisition updated successfully',
      requisition,
    });
  } catch (e) {
    if (e.message === 'Requisition not found') {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    if (
      e.message ===
      'Only requisitions with status "pending_approval" can be edited'
    ) {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error updating requisition', e);
    next(e);
  }
};

export const approveRequisitionById = async (req, res, next) => {
  try {
    const idValidation = requisitionIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = approveRequisitionSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const { notes } = bodyValidation.data;

    logger.info(`Approving requisition ${id}...`);

    const requisition = await approveRequisition(id, req.user.id, notes);

    await logAudit(req, 'APPROVE', 'requisition', id);

    res.status(200).json({
      message: 'Requisition approved successfully',
      requisition,
    });
  } catch (e) {
    if (e.message === 'Requisition not found') {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    if (
      e.message ===
      'Only requisitions with status "pending_approval" can be approved'
    ) {
      return res.status(409).json({ error: e.message });
    }

    if (e.message && e.message.includes('Insufficient budget')) {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error approving requisition', e);
    next(e);
  }
};

export const rejectRequisitionById = async (req, res, next) => {
  try {
    const idValidation = requisitionIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = rejectRequisitionSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const { notes } = bodyValidation.data;

    logger.info(`Rejecting requisition ${id}...`);

    const requisition = await rejectRequisition(id, req.user.id, notes);

    await logAudit(req, 'REJECT', 'requisition', id);

    res.status(200).json({
      message: 'Requisition rejected successfully',
      requisition,
    });
  } catch (e) {
    if (e.message === 'Requisition not found') {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    if (
      e.message ===
      'Only requisitions with status "pending_approval" can be rejected'
    ) {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error rejecting requisition', e);
    next(e);
  }
};

export const deleteRequisitionById = async (req, res, next) => {
  try {
    const validationResult = requisitionIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Deleting requisition ${id}...`);

    const requisition = await deleteRequisition(id);

    await logAudit(req, 'DELETE', 'requisition', id, requisition);

    res.status(200).json({
      message: 'Requisition deleted successfully',
      requisition,
    });
  } catch (e) {
    if (e.message === 'Requisition not found') {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    logger.error('Error deleting requisition', e);
    next(e);
  }
};

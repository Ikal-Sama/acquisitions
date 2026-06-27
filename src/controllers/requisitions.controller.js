import logger from '#config/logger.js';
import { parsePagination, paginationMeta } from '#utils/pagination.js';
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

export const fetchAllRequisitions = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.status) filters.status = req.query.status;
    if (req.query.department_id)
      filters.department_id = req.query.department_id;

    // Regular users can only see their own requisitions
    if (req.user.role !== 'admin') {
      filters.requested_by = req.user.id;
    }

    const pagination = parsePagination(req.query);
    const search = req.query.search || '';

    logger.info('Getting requisitions...');

    const { data, total } = await getAllRequisitions(
      filters,
      pagination,
      search
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

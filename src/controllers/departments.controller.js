import logger from '#config/logger.js';
import {
  parsePagination,
  paginationMeta,
  parseSort,
  parseFields,
  parseFilters,
} from '#utils/pagination.js';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '#services/departments.service.js';
import {
  departmentIdSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from '#validations/departments.validation.js';
import { formatValidationError } from '#utils/format.js';
import { logAudit } from '#services/audit_logs.service.js';

const FILTER_CONFIG = {
  code: { type: 'string', operators: ['eq'] },
  created_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
  updated_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
};

export const fetchAllDepartments = async (req, res, next) => {
  try {
    logger.info('Getting departments...');

    const filters = parseFilters(req.query, FILTER_CONFIG);
    const pagination = parsePagination(req.query);
    const search = req.query.search || '';
    const sort = parseSort(req.query, ['name', 'code', 'created_at']);
    const fields = parseFields(req.query, [
      'name',
      'code',
      'description',
      'created_at',
    ]);

    const { data, total } = await getAllDepartments(
      filters,
      pagination,
      search,
      sort,
      fields
    );

    res.status(200).json({
      message: 'Successfully retrieved departments',
      departments: data,
      count: data.length,
      pagination: paginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    logger.error('Error fetching departments', error);
    next(error);
  }
};

export const fetchDepartmentById = async (req, res, next) => {
  try {
    const validationResult = departmentIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting department by id ${id}...`);

    const department = await getDepartmentById(id);

    res.status(200).json({
      message: 'Successfully retrieved department',
      department,
    });
  } catch (e) {
    if (e.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }

    logger.error('Error fetching department by id', e);
    next(e);
  }
};

export const createNewDepartment = async (req, res, next) => {
  try {
    const validationResult = createDepartmentSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    logger.info('Creating new department...');

    const department = await createDepartment(validationResult.data);

    logAudit(req, 'CREATE', 'department', department.id);

    res.status(201).json({
      message: 'Department created successfully',
      department,
    });
  } catch (e) {
    logger.error('Error creating department', e);
    next(e);
  }
};

export const updateDepartmentById = async (req, res, next) => {
  try {
    const idValidation = departmentIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateDepartmentSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    logger.info(`Updating department ${id}...`);

    const department = await updateDepartment(id, updates);

    logAudit(req, 'UPDATE', 'department', id, { id }, department);

    res.status(200).json({
      message: 'Department updated successfully',
      department,
    });
  } catch (e) {
    if (e.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }

    logger.error('Error updating department', e);
    next(e);
  }
};

export const deleteDepartmentById = async (req, res, next) => {
  try {
    const validationResult = departmentIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Deleting department ${id}...`);

    const department = await deleteDepartment(id);

    logAudit(req, 'DELETE', 'department', id, department);

    res.status(200).json({
      message: 'Department deleted successfully',
      department,
    });
  } catch (e) {
    if (e.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }

    logger.error('Error deleting department', e);
    next(e);
  }
};

import logger from '#config/logger.js';
import {
  parsePagination,
  paginationMeta,
  parseSort,
  parseFields,
  parseFilters,
} from '#utils/pagination.js';
import {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  checkBudgetAvailability,
  deleteBudget,
} from '#services/budgets.service.js';
import {
  budgetIdSchema,
  createBudgetSchema,
  updateBudgetSchema,
} from '#validations/budgets.validation.js';
import { formatValidationError } from '#utils/format.js';
import { logAudit } from '#services/audit_logs.service.js';

const FILTER_CONFIG = {
  fiscal_year: { type: 'integer', operators: ['eq', 'gte', 'lte', 'gt', 'lt'] },
  department_id: { type: 'integer', operators: ['eq'] },
  allocated_amount: {
    type: 'number',
    operators: ['eq', 'gte', 'lte', 'gt', 'lt'],
  },
  spent_amount: { type: 'number', operators: ['eq', 'gte', 'lte', 'gt', 'lt'] },
  created_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
  updated_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
};

export const fetchAllBudgets = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query, FILTER_CONFIG);
    const pagination = parsePagination(req.query);
    const sort = parseSort(req.query, [
      'fiscal_year',
      'allocated_amount',
      'spent_amount',
      'created_at',
    ]);
    const fields = parseFields(req.query, [
      'fiscal_year',
      'allocated_amount',
      'spent_amount',
      'created_at',
      'department_id',
    ]);

    logger.info('Getting budgets...');

    const { data, total } = await getAllBudgets(
      filters,
      pagination,
      '',
      sort,
      fields
    );

    res.status(200).json({
      message: 'Successfully retrieved budgets',
      budgets: data,
      count: data.length,
      pagination: paginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    logger.error('Error fetching budgets', error);
    next(error);
  }
};

export const fetchBudgetById = async (req, res, next) => {
  try {
    const validationResult = budgetIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting budget by id ${id}...`);

    const budget = await getBudgetById(id);

    res.status(200).json({
      message: 'Successfully retrieved budget',
      budget,
    });
  } catch (e) {
    if (e.message === 'Budget not found') {
      return res.status(404).json({ error: 'Budget not found' });
    }

    logger.error('Error fetching budget by id', e);
    next(e);
  }
};

export const createNewBudget = async (req, res, next) => {
  try {
    const validationResult = createBudgetSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    logger.info('Creating new budget...');

    const budget = await createBudget(validationResult.data);

    logAudit(req, 'CREATE', 'budget', budget.id);

    res.status(201).json({
      message: 'Budget created successfully',
      budget,
    });
  } catch (e) {
    if (
      e.message &&
      e.message.startsWith('Budget already exists for this department')
    ) {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error creating budget', e);
    next(e);
  }
};

export const updateBudgetById = async (req, res, next) => {
  try {
    const idValidation = budgetIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateBudgetSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    logger.info(`Updating budget ${id}...`);

    const budget = await updateBudget(id, updates);

    logAudit(req, 'UPDATE', 'budget', id, { id }, budget);

    res.status(200).json({
      message: 'Budget updated successfully',
      budget,
    });
  } catch (e) {
    if (e.message === 'Budget not found') {
      return res.status(404).json({ error: 'Budget not found' });
    }

    logger.error('Error updating budget', e);
    next(e);
  }
};

export const checkBudget = async (req, res, next) => {
  try {
    const { department_id, amount, fiscal_year } = req.query;

    if (!department_id || !amount) {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'department_id and amount are required query parameters',
      });
    }

    const deptId = parseInt(department_id, 10);
    const cost = parseFloat(amount);
    const year = fiscal_year ? parseInt(fiscal_year, 10) : undefined;

    if (isNaN(deptId) || isNaN(cost)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'department_id and amount must be valid numbers',
      });
    }

    logger.info(`Checking budget for department ${deptId}, amount $${cost}...`);

    const result = await checkBudgetAvailability(deptId, cost, year);

    res.status(200).json({
      message: result.available ? 'Budget is available' : 'Insufficient budget',
      available: result.available,
      remaining: result.remaining,
      ...(result.message && { details: result.message }),
    });
  } catch (e) {
    logger.error('Error checking budget', e);
    next(e);
  }
};

export const deleteBudgetById = async (req, res, next) => {
  try {
    const validationResult = budgetIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Deleting budget ${id}...`);

    const budget = await deleteBudget(id);

    logAudit(req, 'DELETE', 'budget', id, budget);

    res.status(200).json({
      message: 'Budget deleted successfully',
      budget,
    });
  } catch (e) {
    if (e.message === 'Budget not found') {
      return res.status(404).json({ error: 'Budget not found' });
    }

    logger.error('Error deleting budget', e);
    next(e);
  }
};

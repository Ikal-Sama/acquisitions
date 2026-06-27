import { z } from 'zod';
import logger from '#config/logger.js';
import { formatValidationError } from '#utils/format.js';
import {
  getSummary,
  getSpendByDepartment,
  getSpendByVendor,
  getBudgetUtilization,
} from '#services/analytics.service.js';

const budgetUtilizationQuerySchema = z.object({
  fiscal_year: z.coerce.number().int().positive().optional(),
});

export const fetchSummary = async (req, res, next) => {
  try {
    logger.info('Getting procurement summary...');

    const data = await getSummary();

    res.status(200).json({
      message: 'Successfully retrieved summary',
      data,
    });
  } catch (error) {
    logger.error('Error fetching summary', error);
    next(error);
  }
};

export const fetchSpendByDepartment = async (req, res, next) => {
  try {
    logger.info('Getting spend by department...');

    const data = await getSpendByDepartment();

    res.status(200).json({
      message: 'Successfully retrieved spend by department',
      data,
      count: data.length,
    });
  } catch (error) {
    logger.error('Error fetching spend by department', error);
    next(error);
  }
};

export const fetchSpendByVendor = async (req, res, next) => {
  try {
    logger.info('Getting spend by vendor...');

    const data = await getSpendByVendor();

    res.status(200).json({
      message: 'Successfully retrieved spend by vendor',
      data,
      count: data.length,
    });
  } catch (error) {
    logger.error('Error fetching spend by vendor', error);
    next(error);
  }
};

export const fetchBudgetUtilization = async (req, res, next) => {
  try {
    const parsed = budgetUtilizationQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(parsed.error),
      });
    }

    const fiscalYear = parsed.data.fiscal_year;

    logger.info('Getting budget utilization...');

    const data = await getBudgetUtilization(fiscalYear);

    res.status(200).json({
      message: 'Successfully retrieved budget utilization',
      data,
      count: data.length,
    });
  } catch (error) {
    logger.error('Error fetching budget utilization', error);
    next(error);
  }
};

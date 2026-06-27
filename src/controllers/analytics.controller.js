import logger from '#config/logger.js';
import {
  getSummary,
  getSpendByDepartment,
  getSpendByVendor,
  getBudgetUtilization,
} from '#services/analytics.service.js';

export const fetchSummary = async (req, res, next) => {
  try {
    logger.info('Getting procurement summary...');

    const summary = await getSummary();

    res.status(200).json({
      message: 'Successfully retrieved summary',
      summary,
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
    const fiscalYear = req.query.fiscal_year
      ? parseInt(req.query.fiscal_year, 10)
      : undefined;

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

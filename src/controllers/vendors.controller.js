import logger from '#config/logger.js';
import {
  parsePagination,
  paginationMeta,
  parseSort,
  parseFields,
  parseFilters,
} from '#utils/pagination.js';
import {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} from '#services/vendors.service.js';
import {
  vendorIdSchema,
  createVendorSchema,
  updateVendorSchema,
} from '#validations/vendors.validation.js';
import { formatValidationError } from '#utils/format.js';

const FILTER_CONFIG = {
  email: { type: 'string', operators: ['eq'] },
  phone: { type: 'string', operators: ['eq'] },
  name: { type: 'string', operators: ['eq'] },
  created_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
  updated_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
};

export const fetchAllVendors = async (req, res, next) => {
  try {
    logger.info('Getting all vendors...');

    const filters = parseFilters(req.query, FILTER_CONFIG);
    const pagination = parsePagination(req.query);
    const search = req.query.search || '';
    const sort = parseSort(req.query, ['name', 'email', 'created_at']);
    const fields = parseFields(req.query, [
      'name',
      'email',
      'phone',
      'address',
      'created_at',
    ]);

    const { data, total } = await getAllVendors(
      filters,
      pagination,
      search,
      sort,
      fields
    );

    res.status(200).json({
      message: 'Successfully retrieved vendors',
      vendors: data,
      count: data.length,
      pagination: paginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    logger.error('Error fetching all vendors', error);
    next(error);
  }
};

export const fetchVendorById = async (req, res, next) => {
  try {
    const validationResult = vendorIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting vendor by id ${id}...`);

    const vendor = await getVendorById(id);

    res.status(200).json({
      message: 'Successfully retrieved vendor',
      vendor,
    });
  } catch (e) {
    if (e.message === 'Vendor not found') {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    logger.error(`Error fetching vendor by id ${req.params.id}`, e);
    next(e);
  }
};

export const createNewVendor = async (req, res, next) => {
  try {
    const validationResult = createVendorSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    logger.info('Creating new vendor...');

    const vendor = await createVendor(validationResult.data);

    res.status(201).json({
      message: 'Vendor created successfully',
      vendor,
    });
  } catch (e) {
    logger.error('Error creating vendor', e);
    next(e);
  }
};

export const updateVendorById = async (req, res, next) => {
  try {
    const idValidation = vendorIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateVendorSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    logger.info(`Updating vendor ${id}...`);

    const vendor = await updateVendor(id, updates);

    res.status(200).json({
      message: 'Vendor updated successfully',
      vendor,
    });
  } catch (e) {
    if (e.message === 'Vendor not found') {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    logger.error(`Error updating vendor ${req.params.id}`, e);
    next(e);
  }
};

export const deleteVendorById = async (req, res, next) => {
  try {
    const validationResult = vendorIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Deleting vendor ${id}...`);

    const vendor = await deleteVendor(id);

    res.status(200).json({
      message: 'Vendor deleted successfully',
      vendor,
    });
  } catch (e) {
    if (e.message === 'Vendor not found') {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    logger.error(`Error deleting vendor ${req.params.id}`, e);
    next(e);
  }
};

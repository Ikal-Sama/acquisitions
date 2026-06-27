import logger from '#config/logger.js';
import {
  parsePagination,
  paginationMeta,
  parseSort,
} from '#utils/pagination.js';
import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  assignAsset,
  unassignAsset,
  deleteAsset,
} from '#services/assets.service.js';
import {
  assetIdSchema,
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
} from '#validations/assets.validation.js';
import { formatValidationError } from '#utils/format.js';

export const fetchAllAssets = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.status) filters.status = req.query.status;
    if (req.query.assigned_to) filters.assigned_to = req.query.assigned_to;
    if (req.query.purchase_order_id) {
      filters.purchase_order_id = req.query.purchase_order_id;
    }

    const pagination = parsePagination(req.query);
    const search = req.query.search || '';
    const sort = parseSort(req.query, [
      'name',
      'asset_tag',
      'status',
      'created_at',
    ]);

    logger.info('Getting assets...');

    const { data, total } = await getAllAssets(
      filters,
      pagination,
      search,
      sort
    );

    res.status(200).json({
      message: 'Successfully retrieved assets',
      assets: data,
      count: data.length,
      pagination: paginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    logger.error('Error fetching assets', error);
    next(error);
  }
};

export const fetchAssetById = async (req, res, next) => {
  try {
    const validationResult = assetIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting asset by id ${id}...`);

    const asset = await getAssetById(id);

    res.status(200).json({
      message: 'Successfully retrieved asset',
      asset,
    });
  } catch (e) {
    if (e.message === 'Asset not found') {
      return res.status(404).json({ error: 'Asset not found' });
    }

    logger.error('Error fetching asset by id', e);
    next(e);
  }
};

export const createNewAsset = async (req, res, next) => {
  try {
    const validationResult = createAssetSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    logger.info('Creating new asset...');

    const asset = await createAsset(validationResult.data);

    res.status(201).json({
      message: 'Asset created successfully',
      asset,
    });
  } catch (e) {
    logger.error('Error creating asset', e);
    next(e);
  }
};

export const updateAssetById = async (req, res, next) => {
  try {
    const idValidation = assetIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateAssetSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    logger.info(`Updating asset ${id}...`);

    const asset = await updateAsset(id, updates);

    res.status(200).json({
      message: 'Asset updated successfully',
      asset,
    });
  } catch (e) {
    if (e.message === 'Asset not found') {
      return res.status(404).json({ error: 'Asset not found' });
    }

    logger.error('Error updating asset', e);
    next(e);
  }
};

export const assignAssetById = async (req, res, next) => {
  try {
    const idValidation = assetIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = assignAssetSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const { assigned_to } = bodyValidation.data;

    logger.info(`Assigning asset ${id} to user ${assigned_to}...`);

    const asset = await assignAsset(id, assigned_to);

    res.status(200).json({
      message: 'Asset assigned successfully',
      asset,
    });
  } catch (e) {
    if (e.message === 'Asset not found') {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (e.message === 'Cannot assign a retired asset') {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error assigning asset', e);
    next(e);
  }
};

export const unassignAssetById = async (req, res, next) => {
  try {
    const validationResult = assetIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Unassigning asset ${id}...`);

    const asset = await unassignAsset(id);

    res.status(200).json({
      message: 'Asset unassigned successfully',
      asset,
    });
  } catch (e) {
    if (e.message === 'Asset not found') {
      return res.status(404).json({ error: 'Asset not found' });
    }

    logger.error('Error unassigning asset', e);
    next(e);
  }
};

export const deleteAssetById = async (req, res, next) => {
  try {
    const validationResult = assetIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Deleting asset ${id}...`);

    const asset = await deleteAsset(id);

    res.status(200).json({
      message: 'Asset deleted successfully',
      asset,
    });
  } catch (e) {
    if (e.message === 'Asset not found') {
      return res.status(404).json({ error: 'Asset not found' });
    }

    logger.error('Error deleting asset', e);
    next(e);
  }
};

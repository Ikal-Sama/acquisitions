import logger from '#config/logger.js';
import {
  parsePagination,
  paginationMeta,
  parseSort,
} from '#utils/pagination.js';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  sendPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
  getPoItems,
  createPoItem,
  updatePoItem,
  deletePoItem,
} from '#services/purchase_orders.service.js';
import {
  purchaseOrderIdSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  createPoItemSchema,
  updatePoItemSchema,
  poItemIdSchema,
} from '#validations/purchase_orders.validation.js';
import { formatValidationError } from '#utils/format.js';

export const fetchAllPurchaseOrders = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.status) filters.status = req.query.status;
    if (req.query.vendor_id) filters.vendor_id = req.query.vendor_id;

    const pagination = parsePagination(req.query);
    const search = req.query.search || '';
    const sort = parseSort(req.query, [
      'po_number',
      'status',
      'total_amount',
      'created_at',
    ]);

    logger.info('Getting purchase orders...');

    const { data, total } = await getAllPurchaseOrders(
      filters,
      pagination,
      search,
      sort
    );

    res.status(200).json({
      message: 'Successfully retrieved purchase orders',
      purchase_orders: data,
      count: data.length,
      pagination: paginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    logger.error('Error fetching purchase orders', error);
    next(error);
  }
};

export const fetchPurchaseOrderById = async (req, res, next) => {
  try {
    const validationResult = purchaseOrderIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting purchase order by id ${id}...`);

    const po = await getPurchaseOrderById(id);

    res.status(200).json({
      message: 'Successfully retrieved purchase order',
      purchase_order: po,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    logger.error('Error fetching purchase order by id', e);
    next(e);
  }
};

export const createNewPurchaseOrder = async (req, res, next) => {
  try {
    const validationResult = createPurchaseOrderSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    logger.info('Creating new purchase order...');

    const po = await createPurchaseOrder(validationResult.data, req.user.id);

    res.status(201).json({
      message: 'Purchase order created successfully',
      purchase_order: po,
    });
  } catch (e) {
    logger.error('Error creating purchase order', e);
    next(e);
  }
};

export const updatePurchaseOrderById = async (req, res, next) => {
  try {
    const idValidation = purchaseOrderIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updatePurchaseOrderSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    logger.info(`Updating purchase order ${id}...`);

    const po = await updatePurchaseOrder(id, updates);

    res.status(200).json({
      message: 'Purchase order updated successfully',
      purchase_order: po,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (e.message === 'Only draft purchase orders can be edited') {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error updating purchase order', e);
    next(e);
  }
};

export const sendPurchaseOrderById = async (req, res, next) => {
  try {
    const validationResult = purchaseOrderIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Sending purchase order ${id}...`);

    const po = await sendPurchaseOrder(id);

    res.status(200).json({
      message: 'Purchase order sent to vendor',
      purchase_order: po,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (e.message === 'Only draft purchase orders can be sent') {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error sending purchase order', e);
    next(e);
  }
};

export const receivePurchaseOrderById = async (req, res, next) => {
  try {
    const validationResult = purchaseOrderIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Receiving purchase order ${id}...`);

    const po = await receivePurchaseOrder(id);

    res.status(200).json({
      message: 'Purchase order marked as received',
      purchase_order: po,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (
      e.message === 'Cannot receive a cancelled purchase order' ||
      e.message === 'Cannot receive a draft purchase order' ||
      e.message === 'Purchase order has already been received'
    ) {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error receiving purchase order', e);
    next(e);
  }
};

export const cancelPurchaseOrderById = async (req, res, next) => {
  try {
    const validationResult = purchaseOrderIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Cancelling purchase order ${id}...`);

    const po = await cancelPurchaseOrder(id);

    res.status(200).json({
      message: 'Purchase order cancelled',
      purchase_order: po,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (
      e.message === 'Cannot cancel a received purchase order' ||
      e.message === 'Purchase order has already been cancelled'
    ) {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error cancelling purchase order', e);
    next(e);
  }
};

export const deletePurchaseOrderById = async (req, res, next) => {
  try {
    const validationResult = purchaseOrderIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Deleting purchase order ${id}...`);

    const po = await deletePurchaseOrder(id);

    res.status(200).json({
      message: 'Purchase order deleted successfully',
      purchase_order: po,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (e.message === 'Only draft purchase orders can be deleted') {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error deleting purchase order', e);
    next(e);
  }
};

// --- Items ---

export const fetchPoItems = async (req, res, next) => {
  try {
    const validationResult = purchaseOrderIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    const items = await getPoItems(id);

    res.status(200).json({
      message: 'Successfully retrieved items',
      items,
      count: items.length,
    });
  } catch (e) {
    logger.error('Error fetching PO items', e);
    next(e);
  }
};

export const addPoItem = async (req, res, next) => {
  try {
    const idValidation = purchaseOrderIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = createPoItemSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;

    logger.info(`Adding item to purchase order ${id}...`);

    const item = await createPoItem(id, bodyValidation.data);

    res.status(201).json({
      message: 'Item added to purchase order',
      item,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (e.message === 'Cannot add items to a non-draft purchase order') {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error adding item to purchase order', e);
    next(e);
  }
};

export const updatePoItemById = async (req, res, next) => {
  try {
    const idValidation = poItemIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updatePoItemSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id, itemId } = idValidation.data;

    logger.info(`Updating item ${itemId} on purchase order ${id}...`);

    const item = await updatePoItem(id, itemId, bodyValidation.data);

    res.status(200).json({
      message: 'Item updated successfully',
      item,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (e.message === 'Item not found on this purchase order') {
      return res.status(404).json({ error: e.message });
    }

    if (e.message === 'Cannot edit items on a non-draft purchase order') {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error updating PO item', e);
    next(e);
  }
};

export const deletePoItemById = async (req, res, next) => {
  try {
    const idValidation = poItemIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const { id, itemId } = idValidation.data;

    logger.info(`Deleting item ${itemId} from purchase order ${id}...`);

    const item = await deletePoItem(id, itemId);

    res.status(200).json({
      message: 'Item removed from purchase order',
      item,
    });
  } catch (e) {
    if (e.message === 'Purchase order not found') {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (e.message === 'Item not found on this purchase order') {
      return res.status(404).json({ error: e.message });
    }

    if (e.message === 'Cannot delete items from a non-draft purchase order') {
      return res.status(409).json({ error: e.message });
    }

    logger.error('Error deleting PO item', e);
    next(e);
  }
};

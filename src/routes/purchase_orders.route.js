import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import { requireRole } from '#middleware/role.middleware.js';
import {
  fetchAllPurchaseOrders,
  fetchPurchaseOrderById,
  createNewPurchaseOrder,
  updatePurchaseOrderById,
  sendPurchaseOrderById,
  receivePurchaseOrderById,
  cancelPurchaseOrderById,
  deletePurchaseOrderById,
  fetchPoItems,
  addPoItem,
  updatePoItemById,
  deletePoItemById,
} from '#controllers/purchase_orders.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllPurchaseOrders);
router.get('/:id', authenticate, fetchPurchaseOrderById);
router.post('/', authenticate, requireRole('admin'), createNewPurchaseOrder);
router.put('/:id', authenticate, requireRole('admin'), updatePurchaseOrderById);
router.patch(
  '/:id/send',
  authenticate,
  requireRole('admin'),
  sendPurchaseOrderById
);
router.patch(
  '/:id/receive',
  authenticate,
  requireRole('admin'),
  receivePurchaseOrderById
);
router.patch(
  '/:id/cancel',
  authenticate,
  requireRole('admin'),
  cancelPurchaseOrderById
);
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  deletePurchaseOrderById
);

router.get('/:id/items', authenticate, fetchPoItems);
router.post('/:id/items', authenticate, requireRole('admin'), addPoItem);
router.put(
  '/:id/items/:itemId',
  authenticate,
  requireRole('admin'),
  updatePoItemById
);
router.delete(
  '/:id/items/:itemId',
  authenticate,
  requireRole('admin'),
  deletePoItemById
);

export default router;

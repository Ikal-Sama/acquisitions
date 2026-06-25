import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import { requireRole } from '#middleware/role.middleware.js';
import {
  fetchAllAssets,
  fetchAssetById,
  createNewAsset,
  updateAssetById,
  assignAssetById,
  unassignAssetById,
  deleteAssetById,
} from '#controllers/assets.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllAssets);
router.get('/:id', authenticate, fetchAssetById);
router.post('/', authenticate, requireRole('admin'), createNewAsset);
router.put('/:id', authenticate, requireRole('admin'), updateAssetById);
router.patch(
  '/:id/assign',
  authenticate,
  requireRole('admin'),
  assignAssetById
);
router.patch(
  '/:id/unassign',
  authenticate,
  requireRole('admin'),
  unassignAssetById
);
router.delete('/:id', authenticate, requireRole('admin'), deleteAssetById);

export default router;

import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import { requireRole } from '#middleware/role.middleware.js';
import {
  fetchAllVendors,
  fetchVendorById,
  createNewVendor,
  updateVendorById,
  deleteVendorById,
} from '#controllers/vendors.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllVendors);
router.get('/:id', authenticate, fetchVendorById);
router.post('/', authenticate, requireRole('admin'), createNewVendor);
router.put('/:id', authenticate, requireRole('admin'), updateVendorById);
router.delete('/:id', authenticate, requireRole('admin'), deleteVendorById);

export default router;

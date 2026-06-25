import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import { requireRole } from '#middleware/role.middleware.js';
import {
  fetchAllRequisitions,
  fetchRequisitionById,
  createNewRequisition,
  updateRequisitionById,
  approveRequisitionById,
  rejectRequisitionById,
  deleteRequisitionById,
} from '#controllers/requisitions.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllRequisitions);
router.get('/:id', authenticate, fetchRequisitionById);
router.post('/', authenticate, createNewRequisition);
router.put('/:id', authenticate, updateRequisitionById);
router.patch(
  '/:id/approve',
  authenticate,
  requireRole('admin'),
  approveRequisitionById
);
router.patch(
  '/:id/reject',
  authenticate,
  requireRole('admin'),
  rejectRequisitionById
);
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  deleteRequisitionById
);

export default router;

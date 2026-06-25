import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import { requireRole } from '#middleware/role.middleware.js';
import {
  fetchAllDepartments,
  fetchDepartmentById,
  createNewDepartment,
  updateDepartmentById,
  deleteDepartmentById,
} from '#controllers/departments.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllDepartments);
router.get('/:id', authenticate, fetchDepartmentById);
router.post('/', authenticate, requireRole('admin'), createNewDepartment);
router.put('/:id', authenticate, requireRole('admin'), updateDepartmentById);
router.delete('/:id', authenticate, requireRole('admin'), deleteDepartmentById);

export default router;

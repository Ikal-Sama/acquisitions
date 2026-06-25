import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import { requireRole } from '#middleware/role.middleware.js';
import {
  fetchAllBudgets,
  fetchBudgetById,
  createNewBudget,
  updateBudgetById,
  checkBudget,
  deleteBudgetById,
} from '#controllers/budgets.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllBudgets);
router.get('/check', authenticate, checkBudget);
router.get('/:id', authenticate, fetchBudgetById);
router.post('/', authenticate, requireRole('admin'), createNewBudget);
router.put('/:id', authenticate, requireRole('admin'), updateBudgetById);
router.delete('/:id', authenticate, requireRole('admin'), deleteBudgetById);

export default router;

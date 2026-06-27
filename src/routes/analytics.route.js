import { Router } from 'express';
import authenticate from '#middleware/auth.middleware.js';
import {
  fetchSummary,
  fetchSpendByDepartment,
  fetchSpendByVendor,
  fetchBudgetUtilization,
} from '#controllers/analytics.controller.js';

const router = Router();

router.use(authenticate);

router.get('/summary', fetchSummary);
router.get('/spend-by-department', fetchSpendByDepartment);
router.get('/spend-by-vendor', fetchSpendByVendor);
router.get('/budget-utilization', fetchBudgetUtilization);

export default router;

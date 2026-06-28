import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import { requireRole } from '#middleware/role.middleware.js';
import {
  fetchAllAuditLogs,
  fetchAuditLogById,
  deleteAuditLogById,
} from '#controllers/audit_logs.controller.js';

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), fetchAllAuditLogs);
router.get('/:id', authenticate, requireRole('admin'), fetchAuditLogById);
router.delete('/:id', authenticate, requireRole('admin'), deleteAuditLogById);

export default router;

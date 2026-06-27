import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import {
  fetchAllAuditLogs,
  fetchAuditLogById,
} from '#controllers/audit_logs.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllAuditLogs);
router.get('/:id', authenticate, fetchAuditLogById);

export default router;

import express from 'express';
import authenticate from '#middleware/auth.middleware.js';
import { requireRole } from '#middleware/role.middleware.js';
import {
  fetchAllUsers,
  fetchUserById,
  updateUserById,
  deleteUserById,
} from '#controllers/users.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllUsers);
router.get('/:id', authenticate, fetchUserById);
router.put('/:id', authenticate, updateUserById);
router.delete('/:id', authenticate, requireRole('admin'), deleteUserById);

export default router;

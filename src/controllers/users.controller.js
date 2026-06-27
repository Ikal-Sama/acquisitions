import logger from '#config/logger.js';
import {
  parsePagination,
  paginationMeta,
  parseSort,
  parseFields,
  parseFilters,
} from '#utils/pagination.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '#services/users.service.js';
import {
  userIdSchema,
  updateUserSchema,
} from '#validations/users.validation.js';
import { formatValidationError } from '#utils/format.js';

const FILTER_CONFIG = {
  role: { type: 'string', operators: ['eq'] },
  created_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
  updated_at: { type: 'date', operators: ['gte', 'lte', 'gt', 'lt'] },
};

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Getting users...');

    const filters = parseFilters(req.query, FILTER_CONFIG);
    const pagination = parsePagination(req.query);
    const search = req.query.search || '';
    const sort = parseSort(req.query, ['name', 'email', 'role', 'created_at']);
    const fields = parseFields(req.query, [
      'name',
      'email',
      'role',
      'created_at',
    ]);

    const { data, total } = await getAllUsers(
      filters,
      pagination,
      search,
      sort,
      fields
    );

    res.status(200).json({
      message: 'Successfully retrieved users',
      users: data,
      count: data.length,
      pagination: paginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

export const fetchUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting user by id ${id}...`);

    const user = await getUserById(id);

    res.status(200).json({
      message: 'Successfully retrieved user',
      user,
    });
  } catch (e) {
    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.error('Error fetching user by id', e);
    next(e);
  }
};

export const updateUserById = async (req, res, next) => {
  try {
    const idValidation = userIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateUserSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    // Authenticated users can only update their own profile.
    // Admins can update any user's profile.
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res
        .status(403)
        .json({ error: 'Forbidden: you can only update your own account' });
    }

    // Only admins can change a user's role.
    if (updates.role && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: only admins can change roles' });
    }

    logger.info(`Updating user ${id}...`);

    const user = await updateUser(id, updates);

    res.status(200).json({
      message: 'User updated successfully',
      user,
    });
  } catch (e) {
    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.error('Error updating user', e);
    next(e);
  }
};

export const deleteUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Deleting user ${id}...`);

    const user = await deleteUser(id);

    res.status(200).json({
      message: 'User deleted successfully',
      user,
    });
  } catch (e) {
    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.error('Error deleting user', e);
    next(e);
  }
};

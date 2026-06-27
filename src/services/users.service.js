import {
  eq,
  and,
  ilike,
  or,
  sql,
  asc,
  desc,
  gte,
  lte,
  gt,
  lt,
} from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { users } from '#models/user.model.js';
import { hashPassword } from '#services/auth.service.js';
import { escapeLike } from '#utils/format.js';

const PUBLIC_USER_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  created_at: users.created_at,
  updated_at: users.updated_at,
};

const applyFilters = (model, filters) =>
  filters.map(f => {
    switch (f.operator) {
      case 'eq':
        return eq(model[f.field], f.value);
      case 'gte':
        return gte(model[f.field], f.value);
      case 'lte':
        return lte(model[f.field], f.value);
      case 'gt':
        return gt(model[f.field], f.value);
      case 'lt':
        return lt(model[f.field], f.value);
    }
  });

export const getAllUsers = async (
  filters = [],
  pagination = {},
  search = '',
  sort = [],
  fields = []
) => {
  try {
    const { limit, offset } = pagination;

    const conditions = [...applyFilters(users, filters)];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${escapeLike(search)}%`),
          ilike(users.email, `%${escapeLike(search)}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(where);

    let orderBy;

    if (sort.length > 0) {
      orderBy = sort.map(s =>
        s.direction === 'desc' ? desc(users[s.field]) : asc(users[s.field])
      );
    } else {
      orderBy = [desc(users.created_at)];
    }

    const select =
      fields.length > 0
        ? Object.fromEntries(fields.map(f => [f, users[f]]))
        : PUBLIC_USER_COLUMNS;

    const data = await db
      .select(select)
      .from(users)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return { data, total: Number(total) };
  } catch (e) {
    logger.error('Error getting users', e);
    throw e;
  }
};

export const getUserById = async id => {
  try {
    const [user] = await db
      .select(PUBLIC_USER_COLUMNS)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new Error('User not found');

    return user;
  } catch (e) {
    logger.error(`Error getting user by id ${id}`, e);
    throw e;
  }
};

export const updateUser = async (id, updates) => {
  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) throw new Error('User not found');

    const sanitizedUpdates = { ...updates };

    if (sanitizedUpdates.password) {
      sanitizedUpdates.password = await hashPassword(sanitizedUpdates.password);
    }

    sanitizedUpdates.updated_at = new Date();

    const [updatedUser] = await db
      .update(users)
      .set(sanitizedUpdates)
      .where(eq(users.id, id))
      .returning(PUBLIC_USER_COLUMNS);

    logger.info(`User ${updatedUser.email} updated successfully`);

    return updatedUser;
  } catch (e) {
    logger.error(`Error updating user ${id}`, e);
    throw e;
  }
};

export const deleteUser = async id => {
  try {
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    if (!deletedUser) throw new Error('User not found');

    logger.info(`User ${deletedUser.email} deleted successfully`);

    return deletedUser;
  } catch (e) {
    logger.error(`Error deleting user ${id}`, e);
    throw e;
  }
};

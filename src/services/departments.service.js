import { eq, ilike, or, and, asc, sql } from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { departments } from '#models/department.model.js';
import { escapeLike } from '#utils/format.js';

export const getAllDepartments = async (pagination = {}, search = '') => {
  try {
    const { limit, offset } = pagination;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(departments.name, `%${escapeLike(search)}%`),
          ilike(departments.code, `%${escapeLike(search)}%`),
          ilike(departments.description, `%${escapeLike(search)}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: sql`count(*)` })
      .from(departments)
      .where(where);

    const data = await db
      .select()
      .from(departments)
      .where(where)
      .orderBy(asc(departments.name))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(total) };
  } catch (e) {
    logger.error('Error getting departments', e);
    throw e;
  }
};

export const getDepartmentById = async id => {
  try {
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    if (!department) throw new Error('Department not found');

    return department;
  } catch (e) {
    logger.error(`Error getting department by id ${id}`, e);
    throw e;
  }
};

export const createDepartment = async data => {
  try {
    const [newDepartment] = await db
      .insert(departments)
      .values(data)
      .returning();

    logger.info(
      `Department "${newDepartment.name}" (ID: ${newDepartment.id}) created`
    );

    return newDepartment;
  } catch (e) {
    logger.error('Error creating department', e);
    throw e;
  }
};

export const updateDepartment = async (id, updates) => {
  try {
    const [existing] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    if (!existing) throw new Error('Department not found');

    const sanitizedUpdates = { ...updates, updated_at: new Date() };

    const [updated] = await db
      .update(departments)
      .set(sanitizedUpdates)
      .where(eq(departments.id, id))
      .returning();

    logger.info(`Department (ID: ${id}) updated`);

    return updated;
  } catch (e) {
    logger.error(`Error updating department ${id}`, e);
    throw e;
  }
};

export const deleteDepartment = async id => {
  try {
    const [deleted] = await db
      .delete(departments)
      .where(eq(departments.id, id))
      .returning();

    if (!deleted) throw new Error('Department not found');

    logger.info(`Department (ID: ${id}) deleted`);

    return deleted;
  } catch (e) {
    logger.error(`Error deleting department ${id}`, e);
    throw e;
  }
};

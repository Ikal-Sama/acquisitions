import {
  eq,
  and,
  asc,
  desc,
  ilike,
  or,
  sql,
  gte,
  lte,
  gt,
  lt,
} from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { requisitions } from '#models/requisition.model.js';
import { escapeLike } from '#utils/format.js';
import {
  checkBudgetAvailability,
  deductFromBudget,
} from '#services/budgets.service.js';

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

export const getAllRequisitions = async (
  filters = [],
  pagination = {},
  search = '',
  sort = [],
  fields = []
) => {
  try {
    const { limit, offset } = pagination;

    const conditions = [...applyFilters(requisitions, filters)];

    if (search) {
      conditions.push(
        or(
          ilike(requisitions.title, `%${escapeLike(search)}%`),
          ilike(requisitions.description, `%${escapeLike(search)}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: sql`count(*)` })
      .from(requisitions)
      .where(where);

    let orderBy;

    if (sort.length > 0) {
      orderBy = sort.map(s =>
        s.direction === 'desc'
          ? desc(requisitions[s.field])
          : asc(requisitions[s.field])
      );
    } else {
      orderBy = [desc(requisitions.created_at)];
    }

    let queryBuilder;

    if (fields.length > 0) {
      queryBuilder = db
        .select(Object.fromEntries(fields.map(f => [f, requisitions[f]])))
        .from(requisitions);
    } else {
      queryBuilder = db.select().from(requisitions);
    }

    const data = await queryBuilder
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return { data, total: Number(total) };
  } catch (e) {
    logger.error('Error getting requisitions', e);
    throw e;
  }
};

export const getRequisitionById = async id => {
  try {
    const [requisition] = await db
      .select()
      .from(requisitions)
      .where(eq(requisitions.id, id))
      .limit(1);

    if (!requisition) throw new Error('Requisition not found');

    return requisition;
  } catch (e) {
    logger.error(`Error getting requisition by id ${id}`, e);
    throw e;
  }
};

export const createRequisition = async (data, userId) => {
  try {
    const [newRequisition] = await db
      .insert(requisitions)
      .values({ ...data, requested_by: userId })
      .returning();

    logger.info(
      `Requisition "${newRequisition.title}" (ID: ${newRequisition.id}) created by user ${userId}`
    );

    return newRequisition;
  } catch (e) {
    logger.error('Error creating requisition', e);
    throw e;
  }
};

export const updateRequisition = async (id, updates) => {
  try {
    const [existing] = await db
      .select({ id: requisitions.id, status: requisitions.status })
      .from(requisitions)
      .where(eq(requisitions.id, id))
      .limit(1);

    if (!existing) throw new Error('Requisition not found');

    if (existing.status !== 'pending_approval') {
      throw new Error(
        'Only requisitions with status "pending_approval" can be edited'
      );
    }

    const sanitizedUpdates = { ...updates };
    sanitizedUpdates.updated_at = new Date();

    const [updatedRequisition] = await db
      .update(requisitions)
      .set(sanitizedUpdates)
      .where(eq(requisitions.id, id))
      .returning();

    logger.info(`Requisition (ID: ${id}) updated successfully`);

    return updatedRequisition;
  } catch (e) {
    logger.error(`Error updating requisition ${id}`, e);
    throw e;
  }
};

export const approveRequisition = async (id, adminId, notes) => {
  try {
    const [existing] = await db
      .select({
        id: requisitions.id,
        status: requisitions.status,
        estimated_cost: requisitions.estimated_cost,
        department_id: requisitions.department_id,
      })
      .from(requisitions)
      .where(eq(requisitions.id, id))
      .limit(1);

    if (!existing) throw new Error('Requisition not found');

    if (existing.status !== 'pending_approval') {
      throw new Error(
        'Only requisitions with status "pending_approval" can be approved'
      );
    }

    const budgetCheck = await checkBudgetAvailability(
      existing.department_id,
      parseFloat(existing.estimated_cost)
    );

    if (!budgetCheck.available) {
      throw new Error(
        budgetCheck.message || 'Insufficient budget for this requisition'
      );
    }

    const [approved] = await db
      .update(requisitions)
      .set({
        status: 'approved',
        approved_by: adminId,
        notes: notes || undefined,
        updated_at: new Date(),
      })
      .where(eq(requisitions.id, id))
      .returning();

    await deductFromBudget(
      existing.department_id,
      parseFloat(existing.estimated_cost)
    );

    logger.info(`Requisition (ID: ${id}) approved by admin ${adminId}`);

    return approved;
  } catch (e) {
    logger.error(`Error approving requisition ${id}`, e);
    throw e;
  }
};

export const rejectRequisition = async (id, adminId, notes) => {
  try {
    const [existing] = await db
      .select({ id: requisitions.id, status: requisitions.status })
      .from(requisitions)
      .where(eq(requisitions.id, id))
      .limit(1);

    if (!existing) throw new Error('Requisition not found');

    if (existing.status !== 'pending_approval') {
      throw new Error(
        'Only requisitions with status "pending_approval" can be rejected'
      );
    }

    const [rejected] = await db
      .update(requisitions)
      .set({
        status: 'rejected',
        approved_by: adminId,
        notes: notes || undefined,
        updated_at: new Date(),
      })
      .where(eq(requisitions.id, id))
      .returning();

    logger.info(`Requisition (ID: ${id}) rejected by admin ${adminId}`);

    return rejected;
  } catch (e) {
    logger.error(`Error rejecting requisition ${id}`, e);
    throw e;
  }
};

export const deleteRequisition = async id => {
  try {
    const [deleted] = await db
      .delete(requisitions)
      .where(eq(requisitions.id, id))
      .returning();

    if (!deleted) throw new Error('Requisition not found');

    logger.info(`Requisition (ID: ${id}) deleted`);

    return deleted;
  } catch (e) {
    logger.error(`Error deleting requisition ${id}`, e);
    throw e;
  }
};

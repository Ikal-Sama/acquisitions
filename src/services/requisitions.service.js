import { eq, and, desc } from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { requisitions } from '#models/requisition.model.js';
import {
  checkBudgetAvailability,
  deductFromBudget,
} from '#services/budgets.service.js';

export const getAllRequisitions = async (filters = {}) => {
  try {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(requisitions.status, filters.status));
    }

    if (filters.department_id) {
      conditions.push(eq(requisitions.department_id, filters.department_id));
    }

    if (filters.requested_by) {
      conditions.push(eq(requisitions.requested_by, filters.requested_by));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select()
      .from(requisitions)
      .where(where)
      .orderBy(desc(requisitions.created_at));
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

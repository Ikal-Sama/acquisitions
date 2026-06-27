import { eq, and, desc, asc, ilike, or, sql } from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import {
  purchaseOrders,
  purchaseOrderItems,
} from '#models/purchase_order.model.js';

const generatePoNumber = async () => {
  const year = new Date().getFullYear();

  const [lastPo] = await db
    .select({ po_number: purchaseOrders.po_number })
    .from(purchaseOrders)
    .orderBy(desc(purchaseOrders.id))
    .limit(1);

  let nextSeq = 1;

  if (lastPo) {
    const parts = lastPo.po_number.split('-');
    nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `PO-${year}-${String(nextSeq).padStart(4, '0')}`;
};

const recalculateTotalAmount = async poId => {
  const items = await db
    .select({ total_price: purchaseOrderItems.total_price })
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchase_order_id, poId));

  const total = items.reduce(
    (sum, item) => sum + parseFloat(item.total_price),
    0
  );

  await db
    .update(purchaseOrders)
    .set({ total_amount: total.toFixed(2), updated_at: new Date() })
    .where(eq(purchaseOrders.id, poId));

  return total;
};

export const getAllPurchaseOrders = async (
  filters = {},
  pagination = {},
  search = ''
) => {
  try {
    const { limit, offset } = pagination;

    const conditions = [];

    if (filters.status) {
      conditions.push(eq(purchaseOrders.status, filters.status));
    }

    if (filters.vendor_id) {
      conditions.push(eq(purchaseOrders.vendor_id, filters.vendor_id));
    }

    if (search) {
      conditions.push(
        or(
          ilike(purchaseOrders.po_number, `%${search}%`),
          ilike(purchaseOrders.notes, `%${search}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: sql`count(*)` })
      .from(purchaseOrders)
      .where(where);

    const data = await db
      .select()
      .from(purchaseOrders)
      .where(where)
      .orderBy(desc(purchaseOrders.created_at))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(total) };
  } catch (e) {
    logger.error('Error getting purchase orders', e);
    throw e;
  }
};

export const getPurchaseOrderById = async id => {
  try {
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!po) throw new Error('Purchase order not found');

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchase_order_id, id))
      .orderBy(asc(purchaseOrderItems.id));

    return { ...po, items };
  } catch (e) {
    logger.error(`Error getting purchase order by id ${id}`, e);
    throw e;
  }
};

export const createPurchaseOrder = async (data, userId) => {
  try {
    const po_number = await generatePoNumber();

    const [newPo] = await db
      .insert(purchaseOrders)
      .values({ ...data, po_number, created_by: userId })
      .returning();

    logger.info(
      `Purchase order ${po_number} (ID: ${newPo.id}) created by user ${userId}`
    );

    return { ...newPo, items: [] };
  } catch (e) {
    logger.error('Error creating purchase order', e);
    throw e;
  }
};

export const updatePurchaseOrder = async (id, updates) => {
  try {
    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!existing) throw new Error('Purchase order not found');

    if (existing.status !== 'draft') {
      throw new Error('Only draft purchase orders can be edited');
    }

    const sanitizedUpdates = { ...updates };
    sanitizedUpdates.updated_at = new Date();

    const [updated] = await db
      .update(purchaseOrders)
      .set(sanitizedUpdates)
      .where(eq(purchaseOrders.id, id))
      .returning();

    logger.info(`Purchase order (ID: ${id}) updated`);

    return updated;
  } catch (e) {
    logger.error(`Error updating purchase order ${id}`, e);
    throw e;
  }
};

export const sendPurchaseOrder = async id => {
  try {
    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!existing) throw new Error('Purchase order not found');

    if (existing.status !== 'draft') {
      throw new Error('Only draft purchase orders can be sent');
    }

    const [sent] = await db
      .update(purchaseOrders)
      .set({ status: 'sent', updated_at: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();

    logger.info(`Purchase order (ID: ${id}) marked as sent`);

    return sent;
  } catch (e) {
    logger.error(`Error sending purchase order ${id}`, e);
    throw e;
  }
};

export const receivePurchaseOrder = async id => {
  try {
    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!existing) throw new Error('Purchase order not found');

    if (existing.status === 'received') {
      throw new Error('Purchase order has already been received');
    }

    if (existing.status === 'draft') {
      throw new Error('Cannot receive a draft purchase order');
    }

    if (existing.status === 'cancelled') {
      throw new Error('Cannot receive a cancelled purchase order');
    }

    const [received] = await db
      .update(purchaseOrders)
      .set({ status: 'received', updated_at: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();

    logger.info(`Purchase order (ID: ${id}) marked as received`);

    return received;
  } catch (e) {
    logger.error(`Error receiving purchase order ${id}`, e);
    throw e;
  }
};

export const cancelPurchaseOrder = async id => {
  try {
    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!existing) throw new Error('Purchase order not found');

    if (existing.status === 'received') {
      throw new Error('Cannot cancel a received purchase order');
    }

    if (existing.status === 'cancelled') {
      throw new Error('Purchase order has already been cancelled');
    }

    const [cancelled] = await db
      .update(purchaseOrders)
      .set({ status: 'cancelled', updated_at: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();

    logger.info(`Purchase order (ID: ${id}) cancelled`);

    return cancelled;
  } catch (e) {
    logger.error(`Error cancelling purchase order ${id}`, e);
    throw e;
  }
};

export const deletePurchaseOrder = async id => {
  try {
    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!existing) throw new Error('Purchase order not found');

    if (existing.status !== 'draft') {
      throw new Error('Only draft purchase orders can be deleted');
    }

    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchase_order_id, id));

    const [deleted] = await db
      .delete(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .returning();

    logger.info(`Purchase order (ID: ${id}) deleted`);

    return deleted;
  } catch (e) {
    logger.error(`Error deleting purchase order ${id}`, e);
    throw e;
  }
};

// --- Items ---

export const getPoItems = async poId => {
  try {
    return await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchase_order_id, poId))
      .orderBy(asc(purchaseOrderItems.id));
  } catch (e) {
    logger.error(`Error getting items for purchase order ${poId}`, e);
    throw e;
  }
};

export const createPoItem = async (poId, data) => {
  try {
    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);

    if (!existing) throw new Error('Purchase order not found');

    if (existing.status !== 'draft') {
      throw new Error('Cannot add items to a non-draft purchase order');
    }

    const total_price = (data.quantity * data.unit_price).toFixed(2);

    const [newItem] = await db
      .insert(purchaseOrderItems)
      .values({
        purchase_order_id: poId,
        description: data.description,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total_price,
      })
      .returning();

    await recalculateTotalAmount(poId);

    logger.info(`Item added to purchase order (ID: ${poId})`);

    return newItem;
  } catch (e) {
    logger.error(`Error creating item for purchase order ${poId}`, e);
    throw e;
  }
};

export const updatePoItem = async (poId, itemId, data) => {
  try {
    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);

    if (!existing) throw new Error('Purchase order not found');

    if (existing.status !== 'draft') {
      throw new Error('Cannot edit items on a non-draft purchase order');
    }

    const [item] = await db
      .select()
      .from(purchaseOrderItems)
      .where(
        and(
          eq(purchaseOrderItems.id, itemId),
          eq(purchaseOrderItems.purchase_order_id, poId)
        )
      )
      .limit(1);

    if (!item) throw new Error('Item not found on this purchase order');

    const updates = { ...data };
    const quantity = updates.quantity ?? item.quantity;
    const unitPrice = updates.unit_price ?? item.unit_price;
    updates.total_price = (quantity * unitPrice).toFixed(2);

    const [updatedItem] = await db
      .update(purchaseOrderItems)
      .set(updates)
      .where(eq(purchaseOrderItems.id, itemId))
      .returning();

    await recalculateTotalAmount(poId);

    logger.info(`Item (ID: ${itemId}) updated on purchase order (ID: ${poId})`);

    return updatedItem;
  } catch (e) {
    logger.error(`Error updating item ${itemId} on purchase order ${poId}`, e);
    throw e;
  }
};

export const deletePoItem = async (poId, itemId) => {
  try {
    const [existing] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);

    if (!existing) throw new Error('Purchase order not found');

    if (existing.status !== 'draft') {
      throw new Error('Cannot delete items from a non-draft purchase order');
    }

    const [deletedItem] = await db
      .delete(purchaseOrderItems)
      .where(
        and(
          eq(purchaseOrderItems.id, itemId),
          eq(purchaseOrderItems.purchase_order_id, poId)
        )
      )
      .returning();

    if (!deletedItem) throw new Error('Item not found on this purchase order');

    await recalculateTotalAmount(poId);

    logger.info(
      `Item (ID: ${itemId}) deleted from purchase order (ID: ${poId})`
    );

    return deletedItem;
  } catch (e) {
    logger.error(
      `Error deleting item ${itemId} from purchase order ${poId}`,
      e
    );
    throw e;
  }
};

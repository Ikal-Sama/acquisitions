import { eq, and, desc } from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { assets } from '#models/asset.model.js';

const generateAssetTag = async () => {
  const year = new Date().getFullYear();

  const [lastAsset] = await db
    .select({ asset_tag: assets.asset_tag })
    .from(assets)
    .orderBy(desc(assets.id))
    .limit(1);

  let nextSeq = 1;

  if (lastAsset) {
    const parts = lastAsset.asset_tag.split('-');
    nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `AST-${year}-${String(nextSeq).padStart(4, '0')}`;
};

export const getAllAssets = async (filters = {}) => {
  try {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(assets.status, filters.status));
    }

    if (filters.assigned_to) {
      conditions.push(eq(assets.assigned_to, filters.assigned_to));
    }

    if (filters.purchase_order_id) {
      conditions.push(eq(assets.purchase_order_id, filters.purchase_order_id));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select()
      .from(assets)
      .where(where)
      .orderBy(desc(assets.created_at));
  } catch (e) {
    logger.error('Error getting assets', e);
    throw e;
  }
};

export const getAssetById = async id => {
  try {
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    if (!asset) throw new Error('Asset not found');

    return asset;
  } catch (e) {
    logger.error(`Error getting asset by id ${id}`, e);
    throw e;
  }
};

export const createAsset = async data => {
  try {
    const asset_tag = await generateAssetTag();

    const [newAsset] = await db
      .insert(assets)
      .values({ ...data, asset_tag })
      .returning();

    logger.info(`Asset "${newAsset.name}" (Tag: ${asset_tag}) created`);

    return newAsset;
  } catch (e) {
    logger.error('Error creating asset', e);
    throw e;
  }
};

export const updateAsset = async (id, updates) => {
  try {
    const [existing] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    if (!existing) throw new Error('Asset not found');

    const sanitizedUpdates = { ...updates };
    sanitizedUpdates.updated_at = new Date();

    const [updated] = await db
      .update(assets)
      .set(sanitizedUpdates)
      .where(eq(assets.id, id))
      .returning();

    logger.info(`Asset (ID: ${id}) updated`);

    return updated;
  } catch (e) {
    logger.error(`Error updating asset ${id}`, e);
    throw e;
  }
};

export const assignAsset = async (id, userId) => {
  try {
    const [existing] = await db
      .select({ id: assets.id, status: assets.status })
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    if (!existing) throw new Error('Asset not found');

    if (existing.status === 'retired') {
      throw new Error('Cannot assign a retired asset');
    }

    const [assigned] = await db
      .update(assets)
      .set({
        assigned_to: userId,
        status: 'assigned',
        updated_at: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();

    logger.info(`Asset (ID: ${id}) assigned to user ${userId}`);

    return assigned;
  } catch (e) {
    logger.error(`Error assigning asset ${id}`, e);
    throw e;
  }
};

export const unassignAsset = async id => {
  try {
    const [existing] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    if (!existing) throw new Error('Asset not found');

    const [unassigned] = await db
      .update(assets)
      .set({
        assigned_to: null,
        status: 'available',
        updated_at: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();

    logger.info(`Asset (ID: ${id}) unassigned`);

    return unassigned;
  } catch (e) {
    logger.error(`Error unassigning asset ${id}`, e);
    throw e;
  }
};

export const deleteAsset = async id => {
  try {
    const [deleted] = await db
      .delete(assets)
      .where(eq(assets.id, id))
      .returning();

    if (!deleted) throw new Error('Asset not found');

    logger.info(`Asset (ID: ${id}) deleted`);

    return deleted;
  } catch (e) {
    logger.error(`Error deleting asset ${id}`, e);
    throw e;
  }
};

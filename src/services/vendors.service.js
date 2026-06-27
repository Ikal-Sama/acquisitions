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
import { vendors } from '#models/vendor.model.js';
import { escapeLike } from '#utils/format.js';

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

export const getAllVendors = async (
  filters = [],
  pagination = {},
  search = '',
  sort = [],
  fields = []
) => {
  try {
    const { limit, offset } = pagination;

    const conditions = [...applyFilters(vendors, filters)];

    if (search) {
      conditions.push(
        or(
          ilike(vendors.name, `%${escapeLike(search)}%`),
          ilike(vendors.email, `%${escapeLike(search)}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: sql`count(*)` })
      .from(vendors)
      .where(where);

    let orderBy;

    if (sort.length > 0) {
      orderBy = sort.map(s =>
        s.direction === 'desc' ? desc(vendors[s.field]) : asc(vendors[s.field])
      );
    } else {
      orderBy = [asc(vendors.name)];
    }

    let queryBuilder;

    if (fields.length > 0) {
      queryBuilder = db
        .select(Object.fromEntries(fields.map(f => [f, vendors[f]])))
        .from(vendors);
    } else {
      queryBuilder = db.select().from(vendors);
    }

    const data = await queryBuilder
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return { data, total: Number(total) };
  } catch (e) {
    logger.error('Error getting vendors', e);
    throw e;
  }
};

export const getVendorById = async id => {
  try {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id))
      .limit(1);

    if (!vendor) throw new Error('Vendor not found');

    return vendor;
  } catch (e) {
    logger.error(`Error getting vendor by id ${id}`, e);
    throw e;
  }
};

export const createVendor = async data => {
  try {
    const [newVendor] = await db.insert(vendors).values(data).returning();

    logger.info(
      `Vendor ${newVendor.name} (ID: ${newVendor.id}) created successfully`
    );

    return newVendor;
  } catch (e) {
    logger.error('Error creating vendor', e);
    throw e;
  }
};

export const updateVendor = async (id, updates) => {
  try {
    const [existingVendor] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.id, id))
      .limit(1);

    if (!existingVendor) throw new Error('Vendor not found');

    const sanitizedUpdates = { ...updates };
    sanitizedUpdates.updated_at = new Date();

    const [updatedVendor] = await db
      .update(vendors)
      .set(sanitizedUpdates)
      .where(eq(vendors.id, id))
      .returning();

    logger.info(
      `Vendor ${updatedVendor.name} (ID: ${id}) updated successfully`
    );

    return updatedVendor;
  } catch (e) {
    logger.error(`Error updating vendor ${id}`, e);
    throw e;
  }
};

export const deleteVendor = async id => {
  try {
    const [deletedVendor] = await db
      .delete(vendors)
      .where(eq(vendors.id, id))
      .returning();

    if (!deletedVendor) throw new Error('Vendor not found');

    logger.info(
      `Vendor ${deletedVendor.name} (ID: ${id}) deleted successfully`
    );

    return deletedVendor;
  } catch (e) {
    logger.error(`Error deleting vendor ${id}`, e);
    throw e;
  }
};
